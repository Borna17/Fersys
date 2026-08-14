import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const sourceRoot = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (m) => m.slice(1)))
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupRoot = path.join(root, '.fersys-document-studio-backup', stamp)

function read(rel) {
  const file = path.join(root, rel)
  if (!fs.existsSync(file)) throw new Error(`Nedostaje ${rel}`)
  const original = fs.readFileSync(file, 'utf8')
  return { file, rel, eol: original.includes('\r\n') ? '\r\n' : '\n', text: original.replace(/\r\n/g, '\n') }
}
function save(state) {
  const backup = path.join(backupRoot, state.rel)
  fs.mkdirSync(path.dirname(backup), { recursive: true })
  fs.copyFileSync(state.file, backup)
  fs.writeFileSync(state.file, state.eol === '\r\n' ? state.text.replace(/\n/g, '\r\n') : state.text, 'utf8')
  console.log(`✓ ${state.rel}`)
}
function rep(text, oldText, newText, label) {
  if (text.includes(newText)) return text
  if (!text.includes(oldText)) throw new Error(`Nije pronađeno: ${label}`)
  return text.replace(oldText, newText)
}
function copyNew(sourceName, rel) {
  const src = path.join(sourceRoot, sourceName)
  const dest = path.join(root, rel)
  if (fs.existsSync(dest)) {
    const backup = path.join(backupRoot, rel)
    fs.mkdirSync(path.dirname(backup), { recursive: true })
    fs.copyFileSync(dest, backup)
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
  console.log(`✓ ${rel}`)
}

function patchCompanySettings() {
  const s = read('src/services/companySettings.service.ts')

  s.text = rep(
    s.text,
`export type CompanyProfileSettings = {
  timezone?: string
  language?: string
  dateFormat?: string
  timeFormat?: '12h' | '24h'
}`,
`export type CompanyProfileSettings = {
  timezone?: string
  language?: string
  dateFormat?: string
  timeFormat?: '12h' | '24h'
  [key: string]: unknown
}`,
    'CompanyProfileSettings index signature',
  )

  s.text = rep(
    s.text,
`  return {
    timezone:
      typeof value.timezone === 'string'
        ? value.timezone
        : undefined,`,
`  return {
    ...value,

    timezone:
      typeof value.timezone === 'string'
        ? value.timezone
        : undefined,`,
    'preserve unknown profile_settings keys',
  )

  save(s)
}

function patchWorkOrderBranding() {
  const s = read('src/services/workOrderBranding.service.ts')

  s.text = s.text.replace(
`    result.layout =
      value.layout === 'minimal'
        ? 'custom'
        : value.layout`,
`    result.layout =
      value.layout`,
  )

  save(s)
}

function patchSettingsCard() {
  const s = read('src/pages/SettingsPage.tsx')
  s.text = s.text
    .replace('title="Izgled radnog naloga"', 'title="Izgled dokumenata"')
    .replace('description="Boje, logo, pečat, pozadina, raspored i PDF prikaz radnog naloga."', 'description="Posebno uredi radni nalog, ponudu i račun: Modern, Classic, Minimal ili Custom."')
    .replace('action="Uredi izgled"', 'action="Otvori Document Studio"')
  save(s)
}

function appearanceFields(typeName) {
  return `\n  layoutPreset: 'modern' | 'classic' | 'minimal' | 'custom'\n  secondaryColor: string\n  accentColor: string\n  textColor: string\n  borderColor: string\n  backgroundColor: string\n  headerAlignment: 'left' | 'center' | 'right'\n  density: 'comfortable' | 'compact'\n  infoStyle: 'cards' | 'lines'\n  tableStyle: 'solid' | 'soft' | 'minimal'\n  sectionStyle: 'bar' | 'line' | 'plain'\n  showLogo: boolean\n  showWatermark: boolean\n  watermarkText: string\n  documentTitle: string`
}

function patchOfferPdf() {
  const s = read('src/utils/offerPdf.ts')

  if (!s.text.includes("documentAppearance.service")) {
    s.text = rep(
      s.text,
`import {
  getCompanySettings,
} from '../services/companySettings.service'`,
`import {
  getCompanySettings,
} from '../services/companySettings.service'
import {
  getDocumentAppearanceSettings,
} from '../services/documentAppearance.service'`,
      'Offer appearance import',
    )
  }

  s.text = rep(
    s.text,
`  primaryColor: string
  showItemImages: boolean`,
`  primaryColor: string${appearanceFields('OfferPdfSettings')}
  showItemImages: boolean`,
    'Offer appearance fields',
  )

  s.text = rep(
    s.text,
`  primaryColor: '#2563EB',
  showItemImages: true,`,
`  primaryColor: '#2563EB',
  layoutPreset: 'modern',
  secondaryColor: '#0F172A',
  accentColor: '#38BDF8',
  textColor: '#334155',
  borderColor: '#DBE3EE',
  backgroundColor: '#FFFFFF',
  headerAlignment: 'left',
  density: 'comfortable',
  infoStyle: 'cards',
  tableStyle: 'solid',
  sectionStyle: 'bar',
  showLogo: true,
  showWatermark: false,
  watermarkText: 'PONUDA',
  documentTitle: 'PONUDA',
  showItemImages: true,`,
    'Offer default appearance',
  )

  if (!s.text.includes('function appearanceCss(')) {
    const anchor = `function documentCss(
  primaryColor: string,
) {`
    const idx = s.text.indexOf(anchor)
    if (idx < 0) throw new Error('Offer documentCss nije pronađen')
    const companyIdx = s.text.indexOf('\nfunction companyBlock(', idx)
    if (companyIdx < 0) throw new Error('Offer companyBlock nije pronađen')

    const cssFn = `\nfunction appearanceCss(\n  settings: OfferPdfSettings,\n) {\n  const compact =\n    settings.density === 'compact'\n\n  const headerAlignment =\n    settings.headerAlignment === 'center'\n      ? \`\n        .header { grid-template-columns: 1fr; }\n        .company { justify-content: center; text-align: center; }\n        .heading { text-align: center; }\n      \`\n      : settings.headerAlignment === 'right'\n        ? \`\n          .header { direction: rtl; }\n          .header > * { direction: ltr; }\n          .company { justify-content: flex-end; text-align: right; }\n          .heading { text-align: left; }\n        \`\n        : ''\n\n  const preset =\n    settings.layoutPreset === 'classic'\n      ? \`\n        .page::before { height: 1.5mm; }\n        .heading h2 { font-family: Georgia, serif; font-weight: 700; letter-spacing: 0; }\n        .summary, .card, .table-wrap { border-radius: 2px; }\n        .summary > div { background: white; }\n      \`\n      : settings.layoutPreset === 'minimal'\n        ? \`\n          .page::before { display: none; }\n          .header { border-bottom: 1px solid var(--border); padding-top: 0; }\n          .summary { border-radius: 0; background: white; }\n          .summary > div, .summary .total { background: white; }\n          .card { border-radius: 0; padding-left: 0; padding-right: 0; border-left: 0; border-right: 0; }\n          th { background: white; color: var(--ink); border-bottom: 2px solid var(--ink); }\n          .description { border-left: 0; background: white; padding-left: 0; }\n          .table-wrap { border-radius: 0; }\n        \`\n        : ''\n\n  const table =\n    settings.tableStyle === 'minimal'\n      ? \`th { background: white; color: var(--ink); border-bottom: 2px solid var(--primary); }\`\n      : settings.tableStyle === 'soft'\n        ? \`th { background: color-mix(in srgb, var(--primary) 12%, white); color: var(--ink); }\`\n        : ''\n\n  const info =\n    settings.infoStyle === 'lines'\n      ? \`.card { border-radius: 0; border-left: 0; border-right: 0; padding-left: 0; padding-right: 0; }\`\n      : ''\n\n  const section =\n    settings.sectionStyle === 'line'\n      ? \`.section-title { border-bottom: 2px solid var(--primary); padding-bottom: 4px; color: var(--primary); }\`\n      : settings.sectionStyle === 'plain'\n        ? \`.section-title { color: var(--ink); }\`\n        : \`.section-title { display: inline-block; border-radius: 5px; padding: 5px 8px; background: var(--primary); color: white; }\`\n\n  return \`\n    :root {\n      --primary: \${settings.primaryColor};\n      --ink: \${settings.textColor};\n      --text: \${settings.textColor};\n      --border: \${settings.borderColor};\n      --surface: color-mix(in srgb, \${settings.backgroundColor} 92%, \${settings.secondaryColor});\n    }\n    .page { background: \${settings.backgroundColor}; }\n    \${compact ? '.page { padding: 10mm 11mm 8mm; } .card { padding: 9px 10px; } td { padding: 4px 5px; }' : ''}\n    \${headerAlignment}\n    \${preset}\n    \${table}\n    \${info}\n    \${section}\n  \`\n}\n`
    s.text = s.text.slice(0, companyIdx) + cssFn + s.text.slice(companyIdx)
  }

  s.text = s.text.replace(
    `settings.logoDataUrl\n      ?`,
    `settings.showLogo &&\n    settings.logoDataUrl\n      ?`,
  )

  s.text = s.text.replace(
`                  <h2>PONUDA</h2>`,
`                  <h2>${'${escapeHtml(settings.documentTitle)}'}</h2>`,
  )

  s.text = rep(
    s.text,
`    ${'${documentCss('}
      settings.primaryColor,
    )}`, 
`    ${'${documentCss('}
      settings.primaryColor,
    )}
    ${'${appearanceCss(settings)}'}`,
    'Offer appearance CSS call',
  )

  s.text = rep(
    s.text,
`      const company =
        await getCompanySettings()

      const html =`,
`      const [company, appearanceBundle] =
        await Promise.all([
          getCompanySettings(),
          getDocumentAppearanceSettings(),
        ])

      const appearance =
        appearanceBundle.settings.offer

      const html =`,
    'Offer load appearance',
  )

  s.text = rep(
    s.text,
`            ...companySettingsFromCurrent(
              company,
            ),
            ...customSettings,`,
`            ...companySettingsFromCurrent(
              company,
            ),
            layoutPreset: appearance.preset,
            primaryColor: appearance.primaryColor,
            secondaryColor: appearance.secondaryColor,
            accentColor: appearance.accentColor,
            textColor: appearance.textColor,
            borderColor: appearance.borderColor,
            backgroundColor: appearance.backgroundColor,
            headerAlignment: appearance.headerAlignment,
            density: appearance.density,
            infoStyle: appearance.infoStyle,
            tableStyle: appearance.tableStyle,
            sectionStyle: appearance.sectionStyle,
            showLogo: appearance.showLogo,
            showStamp: appearance.showStamp,
            showSignature: appearance.showSignature,
            showFooter: appearance.showFooter,
            showWatermark: appearance.showWatermark,
            watermarkText: appearance.watermarkText,
            documentTitle: appearance.documentTitle,
            showItemImages: appearance.showItemImages,
            footerText: appearance.footerText,
            ...customSettings,`,
    'Offer apply appearance',
  )

  save(s)
}

function patchInvoicePdf() {
  const s = read('src/utils/invoicePdf.ts')

  if (!s.text.includes("documentAppearance.service")) {
    s.text = rep(
      s.text,
`import {
  getCompanySettings,
} from '../services/companySettings.service'`,
`import {
  getCompanySettings,
} from '../services/companySettings.service'
import {
  getDocumentAppearanceSettings,
} from '../services/documentAppearance.service'`,
      'Invoice appearance import',
    )
  }

  s.text = rep(
    s.text,
`  primaryColor: string
  showStamp: boolean`,
`  primaryColor: string${appearanceFields('InvoicePdfSettings')}
  showStamp: boolean`,
    'Invoice appearance fields',
  )

  s.text = rep(
    s.text,
`  primaryColor: '#0F172A',
  showStamp: true,`,
`  primaryColor: '#0F172A',
  layoutPreset: 'modern',
  secondaryColor: '#0F172A',
  accentColor: '#38BDF8',
  textColor: '#334155',
  borderColor: '#DBE3EE',
  backgroundColor: '#FFFFFF',
  headerAlignment: 'left',
  density: 'comfortable',
  infoStyle: 'cards',
  tableStyle: 'solid',
  sectionStyle: 'bar',
  showLogo: true,
  showWatermark: false,
  watermarkText: 'RAČUN',
  documentTitle: 'RAČUN',
  showStamp: true,`,
    'Invoice default appearance',
  )

  if (!s.text.includes('function appearanceCss(')) {
    const idx = s.text.indexOf('function documentCss(')
    if (idx < 0) throw new Error('Invoice documentCss nije pronađen')
    const companyIdx = s.text.indexOf('\nfunction companyBlock(', idx)
    if (companyIdx < 0) throw new Error('Invoice companyBlock nije pronađen')

    const cssFn = `\nfunction appearanceCss(\n  settings: InvoicePdfSettings,\n) {\n  const compact = settings.density === 'compact'\n  const headerAlignment =\n    settings.headerAlignment === 'center'\n      ? \`.header { grid-template-columns: 1fr; } .company { justify-content: center; text-align: center; } .heading { text-align: center; }\`\n      : settings.headerAlignment === 'right'\n        ? \`.header { direction: rtl; } .header > * { direction: ltr; } .company { justify-content: flex-end; text-align: right; } .heading { text-align: left; }\`\n        : ''\n  const preset =\n    settings.layoutPreset === 'classic'\n      ? \`.page::before { height: 1.5mm; } .heading h2 { font-family: Georgia, serif; font-weight: 700; letter-spacing: 0; } .summary, .card, .table-wrap { border-radius: 2px; }\`\n      : settings.layoutPreset === 'minimal'\n        ? \`.page::before { display: none; } .header { border-bottom: 1px solid var(--border); padding-top: 0; } .summary { border-radius: 0; background: white; } .summary > div, .summary .total { background: white; } .card { border-radius: 0; padding-left: 0; padding-right: 0; border-left: 0; border-right: 0; } th { background: white; color: var(--ink); border-bottom: 2px solid var(--ink); } .table-wrap { border-radius: 0; }\`\n        : ''\n  const table = settings.tableStyle === 'minimal'\n    ? \`th { background: white; color: var(--ink); border-bottom: 2px solid var(--primary); }\`\n    : settings.tableStyle === 'soft'\n      ? \`th { background: color-mix(in srgb, var(--primary) 12%, white); color: var(--ink); }\`\n      : ''\n  const info = settings.infoStyle === 'lines'\n    ? \`.card { border-radius: 0; border-left: 0; border-right: 0; padding-left: 0; padding-right: 0; }\`\n    : ''\n  const section = settings.sectionStyle === 'line'\n    ? \`.section-title { border-bottom: 2px solid var(--primary); padding-bottom: 4px; color: var(--primary); }\`\n    : settings.sectionStyle === 'plain'\n      ? \`.section-title { color: var(--ink); }\`\n      : \`.section-title { display: inline-block; border-radius: 5px; padding: 5px 8px; background: var(--primary); color: white; }\`\n  return \`\n    :root { --primary: \${settings.primaryColor}; --ink: \${settings.textColor}; --text: \${settings.textColor}; --border: \${settings.borderColor}; --surface: color-mix(in srgb, \${settings.backgroundColor} 92%, \${settings.secondaryColor}); }\n    .page { background: \${settings.backgroundColor}; }\n    \${compact ? '.page { padding: 10mm 11mm 8mm; } .card { padding: 9px 10px; } td { padding: 4px 5px; }' : ''}\n    \${headerAlignment}\n    \${preset}\n    \${table}\n    \${info}\n    \${section}\n  \`\n}\n`
    s.text = s.text.slice(0, companyIdx) + cssFn + s.text.slice(companyIdx)
  }

  s.text = s.text.replace(
    `settings.logoDataUrl\n      ?`,
    `settings.showLogo &&\n    settings.logoDataUrl\n      ?`,
  )

  s.text = s.text.replace(
    '<h2>RAČUN</h2>',
    `<h2>${'${escapeHtml(settings.documentTitle)}'}</h2>`,
  )

  s.text = rep(
    s.text,
`    ${'${documentCss('}
      settings.primaryColor,
    )}`,
`    ${'${documentCss('}
      settings.primaryColor,
    )}
    ${'${appearanceCss(settings)}'}`,
    'Invoice appearance CSS call',
  )

  const loadOld = `      const company =
        await getCompanySettings()

      const html =`
  if (s.text.includes(loadOld)) {
    s.text = s.text.replace(loadOld, `      const [company, appearanceBundle] =
        await Promise.all([
          getCompanySettings(),
          getDocumentAppearanceSettings(),
        ])

      const appearance =
        appearanceBundle.settings.invoice

      const html =`)
  }

  s.text = rep(
    s.text,
`            ...companySettingsFromCurrent(
              company,
            ),
            ...customSettings,`,
`            ...companySettingsFromCurrent(
              company,
            ),
            layoutPreset: appearance.preset,
            primaryColor: appearance.primaryColor,
            secondaryColor: appearance.secondaryColor,
            accentColor: appearance.accentColor,
            textColor: appearance.textColor,
            borderColor: appearance.borderColor,
            backgroundColor: appearance.backgroundColor,
            headerAlignment: appearance.headerAlignment,
            density: appearance.density,
            infoStyle: appearance.infoStyle,
            tableStyle: appearance.tableStyle,
            sectionStyle: appearance.sectionStyle,
            showLogo: appearance.showLogo,
            showStamp: appearance.showStamp,
            showFooter: appearance.showFooter,
            showWatermark: appearance.showWatermark,
            watermarkText: appearance.watermarkText,
            documentTitle: appearance.documentTitle,
            footerText: appearance.footerText,
            ...customSettings,`,
    'Invoice apply appearance',
  )

  save(s)
}

try {
  console.log('FERSYS Document Studio V1')
  console.log(`Backup: ${backupRoot}`)

  copyNew('documentAppearance.ts', 'src/types/documentAppearance.ts')
  copyNew('documentAppearance.service.ts', 'src/services/documentAppearance.service.ts')
  copyNew('WorkOrderSettingsPage.tsx', 'src/pages/WorkOrderSettingsPage.tsx')

  patchCompanySettings()
  patchWorkOrderBranding()
  patchSettingsCard()
  patchOfferPdf()
  patchInvoicePdf()

  console.log('')
  console.log('✓ Document Studio instaliran.')
  console.log('✓ Radni nalog, ponuda i račun imaju odvojene postavke.')
  console.log('✓ Modern / Classic / Minimal / Custom + live preview.')
  console.log('✓ Native color picker + HEX unos.')
  console.log('✓ profile_settings više ne briše skrivene postavke pri spremanju glavnih Postavki.')
  console.log('Sada pokreni: npm run build')
} catch (error) {
  console.error('')
  console.error('✗ Patch zaustavljen:', error instanceof Error ? error.message : error)
  console.error(`Backup: ${backupRoot}`)
  process.exit(1)
}
