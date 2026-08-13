import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupRoot = path.join(root, '.fersys-mobile-parity-backup', stamp)

function load(rel) {
  const file = path.join(root, rel)
  if (!fs.existsSync(file)) throw new Error(`Nedostaje ${rel}`)
  const original = fs.readFileSync(file, 'utf8')
  return {
    rel,
    file,
    eol: original.includes('\r\n') ? '\r\n' : '\n',
    text: original.replace(/\r\n/g, '\n'),
  }
}

function save(s) {
  const backup = path.join(backupRoot, s.rel)
  fs.mkdirSync(path.dirname(backup), { recursive: true })
  fs.copyFileSync(s.file, backup)
  const output = s.eol === '\r\n' ? s.text.replace(/\n/g, '\r\n') : s.text
  fs.writeFileSync(s.file, output, 'utf8')
  console.log(`✓ ${s.rel}`)
}

function rep(text, oldText, newText, label) {
  if (text.includes(newText)) return text
  if (!text.includes(oldText)) throw new Error(`Nije pronađen očekivani dio: ${label}`)
  return text.replace(oldText, newText)
}

function patchSettingsPage() {
  const s = load('src/pages/SettingsPage.tsx')

  // Mobile save bar must sit above FERSYS bottom navigation.
  s.text = rep(
    s.text,
    'className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:hidden"',
    'className="fixed inset-x-0 bottom-[calc(4.65rem+env(safe-area-inset-bottom))] z-40 border-t border-slate-800 bg-slate-950/95 p-3 backdrop-blur-xl md:hidden"',
    'Settings mobile save bar',
  )

  s.text = s.text.replace(
    'className="mx-auto w-full max-w-[1500px] space-y-4 pb-28 sm:space-y-6 sm:pb-12"',
    'className="mx-auto w-full max-w-[1500px] space-y-4 pb-44 sm:space-y-6 sm:pb-12"',
  )

  // Add Work Order appearance to main Settings overview, available equally on mobile and desktop.
  const docsCard = `        <ControlCenterCard
          icon={<FileText size={23} />}
          title="Dokumenti"
          description="Prefiksi, rokovi, podnožje i vodeni žig."
          action="Uredi dokumente"
          onClick={() => onOpenTab('documents')}
        />`

  const docsAndWorkOrder = `${docsCard}

        <ControlCenterCard
          icon={<Palette size={23} />}
          title="Izgled radnog naloga"
          description="Boje, logo, pečat, pozadina, raspored i PDF prikaz radnog naloga."
          action="Uredi izgled"
          onClick={() =>
            onNavigate('/settings/work-orders')
          }
        />`

  s.text = rep(
    s.text,
    docsCard,
    docsAndWorkOrder,
    'Settings Work Order appearance card',
  )

  save(s)
}

function patchWorkOrderBrandingService() {
  const s = load('src/services/workOrderBranding.service.ts')

  // Do not silently transform user's Minimal layout into Custom.
  s.text = rep(
    s.text,
`    result.layout =
      value.layout === 'minimal'
        ? 'custom'
        : value.layout`,
`    result.layout =
      value.layout`,
    'preserve minimal layout while loading',
  )

  s.text = rep(
    s.text,
`      layout:
        layout === 'minimal'
          ? 'custom'
          : layout,`,
`      layout,`,
    'preserve minimal layout while saving',
  )

  save(s)
}

function patchWorkOrderSettingsPage() {
  const s = load('src/pages/WorkOrderSettingsPage.tsx')

  s.text = rep(
    s.text,
`  Building2,
  ImagePlus,`,
`  ArrowLeft,
  Building2,
  ImagePlus,`,
    'WorkOrderSettings back icon',
  )

  if (!s.text.includes("import { useNavigate } from 'react-router'")) {
    s.text = rep(
      s.text,
`import { useEffect, useState, type ChangeEvent } from 'react'`,
`import { useEffect, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router'`,
      'WorkOrderSettings navigate import',
    )
  }

  if (!s.text.includes("../components/FersysLoader")) {
    s.text = rep(
      s.text,
`import {
  defaultWorkOrderBranding,
  type WorkOrderBranding,
} from '../types/workOrder'`,
`import FersysLoader from '../components/FersysLoader'
import {
  defaultWorkOrderBranding,
  type WorkOrderBranding,
} from '../types/workOrder'`,
      'WorkOrderSettings loader import',
    )
  }

  s.text = rep(
    s.text,
`import {
  readBranding,
  writeBranding,
} from '../utils/workOrderStorage'`,
`import {
  getWorkOrderBrandingFromCompanySettings,
  resetWorkOrderBranding,
  saveWorkOrderBranding,
} from '../services/workOrderBranding.service'`,
    'cloud branding imports',
  )

  s.text = rep(
    s.text,
`export function WorkOrderSettingsPage() {
  const [branding, setBranding] = useState<WorkOrderBranding>(() =>
    readBranding(),
  )
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    writeBranding(branding)
  }, [branding])`,
`export function WorkOrderSettingsPage() {
  const navigate = useNavigate()
  const [branding, setBranding] = useState<WorkOrderBranding>(
    defaultWorkOrderBranding,
  )
  const [saved, setSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadBranding() {
      try {
        setIsLoading(true)
        setError('')
        const current =
          await getWorkOrderBrandingFromCompanySettings()

        if (!cancelled) {
          setBranding(current)
        }
      } catch (value) {
        if (!cancelled) {
          setError(
            value instanceof Error
              ? value.message
              : 'Izgled radnog naloga nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadBranding()

    return () => {
      cancelled = true
    }
  }, [])`,
    'WorkOrderSettings cloud state/load',
  )

  s.text = rep(
    s.text,
`  function saveSettings() {
    writeBranding(branding)
    setSaved(true)
  }

  function resetSettings() {
    setBranding(defaultWorkOrderBranding)
    setSaved(false)
  }`,
`  async function saveSettings() {
    if (isSaving) return

    try {
      setIsSaving(true)
      setError('')
      const savedBranding =
        await saveWorkOrderBranding(branding)
      setBranding(savedBranding)
      setSaved(true)
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Izgled radnog naloga nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function resetSettings() {
    if (isSaving) return

    try {
      setIsSaving(true)
      setError('')
      const resetBranding =
        await resetWorkOrderBranding()
      setBranding(resetBranding)
      setSaved(false)
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Zadani izgled nije moguće vratiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <FersysLoader text="Učitavanje izgleda radnog naloga..." />
    )
  }`,
    'WorkOrderSettings cloud save/reset',
  )

  // Add a clear return to main Settings and cloud error feedback.
  s.text = rep(
    s.text,
`    <section className="mx-auto w-full max-w-[1500px] space-y-4 pb-28 sm:space-y-6 sm:pb-12">
      <section className="relative overflow-hidden`,
`    <section className="mx-auto w-full max-w-[1500px] space-y-4 pb-44 sm:space-y-6 sm:pb-12">
      <button
        type="button"
        onClick={() => navigate('/settings')}
        className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-black text-slate-300 active:scale-[0.99]"
      >
        <ArrowLeft size={18} />
        Postavke
      </button>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="relative overflow-hidden`,
    'WorkOrderSettings back/error/mobile spacing',
  )

  // Desktop buttons: async, disabled and visible state.
  s.text = s.text.replace(
    'onClick={resetSettings}\n            className="flex h-12 items-center gap-2 rounded-xl bg-slate-800 px-5 font-semibold text-white"',
    'onClick={() => void resetSettings()}\n            disabled={isSaving}\n            className="flex h-12 items-center gap-2 rounded-xl bg-slate-800 px-5 font-semibold text-white disabled:opacity-50"',
  )
  s.text = s.text.replace(
    'onClick={saveSettings}\n            className="flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white"',
    'onClick={() => void saveSettings()}\n            disabled={isSaving}\n            className="flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white disabled:opacity-50"',
  )

  // Mobile save bar must be above the global FERSYS navigation.
  s.text = rep(
    s.text,
    'className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:hidden"',
    'className="fixed inset-x-0 bottom-[calc(4.65rem+env(safe-area-inset-bottom))] z-40 border-t border-slate-800 bg-slate-950/95 p-3 backdrop-blur-xl md:hidden"',
    'WorkOrderSettings mobile save bar',
  )
  s.text = s.text.replace(
    'onClick={saveSettings}\n          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 font-black text-white active:scale-[0.99]"',
    'onClick={() => void saveSettings()}\n          disabled={isSaving}\n          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 font-black text-white active:scale-[0.99] disabled:opacity-50"',
  )

  save(s)
}

function patchWorkOrdersPage() {
  const s = load('src/pages/WorkOrdersPage.tsx')

  s.text = rep(
    s.text,
`import { downloadWorkOrderPdf } from '../utils/workOrderPdf'
import { readBranding } from '../utils/workOrderStorage'`,
`import { downloadWorkOrderPdf } from '../utils/workOrderPdf'
import {
  getWorkOrderBrandingFromCompanySettings,
} from '../services/workOrderBranding.service'`,
    'WorkOrders cloud branding import',
  )

  s.text = rep(
    s.text,
`  function handleDownloadPdf(
    order: CloudWorkOrder,
  ) {
    try {
      setDownloadingId(
        order.id,
      )

      downloadWorkOrderPdf(
        canViewPrices
          ? order
          : redactWorkOrderPrices(
              order,
            ),
        readBranding(),
      )
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'PDF nije moguće izraditi.',
      )
    } finally {
      setDownloadingId(
        null,
      )
    }
  }`,
`  async function handleDownloadPdf(
    order: CloudWorkOrder,
  ) {
    try {
      setDownloadingId(
        order.id,
      )

      const branding =
        await getWorkOrderBrandingFromCompanySettings()

      await downloadWorkOrderPdf(
        canViewPrices
          ? order
          : redactWorkOrderPrices(
              order,
            ),
        branding,
      )
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'PDF nije moguće izraditi.',
      )
    } finally {
      setDownloadingId(
        null,
      )
    }
  }`,
    'WorkOrders PDF uses cloud branding',
  )

  save(s)
}

function auditMobileRisks() {
  const pagesDir = path.join(root, 'src/pages')
  if (!fs.existsSync(pagesDir)) return

  const files = fs.readdirSync(pagesDir).filter((name) => name.endsWith('.tsx'))
  const warnings = []

  for (const name of files) {
    const full = path.join(pagesDir, name)
    const text = fs.readFileSync(full, 'utf8')

    const fixedBottomZero = (text.match(/fixed[^\"']*bottom-0[^\"']*sm:hidden/g) || []).length
    const desktopOnlyActions = (text.match(/hidden[^\"']*sm:(?:flex|inline-flex|block)/g) || []).length

    if (fixedBottomZero > 0) {
      warnings.push(`${name}: ${fixedBottomZero} mobile fixed bottom-0 bar(a) — provjeriti preklapanje s navigacijom.`)
    }

    if (desktopOnlyActions >= 4) {
      warnings.push(`${name}: ${desktopOnlyActions} desktop-only responsive blokova — ručno provjeriti parity.`)
    }
  }

  const report = [
    'FERSYS MOBILE PARITY STATIC AUDIT',
    `Vrijeme: ${new Date().toISOString()}`,
    '',
    ...(warnings.length ? warnings : ['Nema očitih upozorenja po osnovnim pravilima.']),
    '',
    'Napomena: ovo je statički sanity check; ne zamjenjuje ručni test stvarnih user flowova.',
  ].join('\n')

  fs.writeFileSync(path.join(root, 'FERSYS_MOBILE_AUDIT_REPORT.txt'), report, 'utf8')
  console.log(`✓ Audit report: FERSYS_MOBILE_AUDIT_REPORT.txt (${warnings.length} upozorenja)`)
}

try {
  console.log('FERSYS mobile parity + Settings audit fix')
  console.log(`Backup: ${backupRoot}`)

  patchSettingsPage()
  patchWorkOrderBrandingService()
  patchWorkOrderSettingsPage()
  patchWorkOrdersPage()
  auditMobileRisks()

  console.log('')
  console.log('✓ Izgled radnog naloga je dostupan iz glavnih Postavki i na mobitelu.')
  console.log('✓ Work Order branding više nije localStorage-only nego cloud/company based.')
  console.log('✓ Desktop i mobitel sada koriste isti spremljeni izgled PDF-a.')
  console.log('✓ Minimal layout se više ne pretvara tiho u Custom.')
  console.log('✓ Mobile save barovi u Postavkama su iznad donje FERSYS navigacije.')
  console.log('Sada pokreni: npm run build')
} catch (error) {
  console.error('')
  console.error('✗ Patch zaustavljen:', error instanceof Error ? error.message : error)
  console.error(`Backup: ${backupRoot}`)
  process.exit(1)
}
