import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupRoot = path.join(root, '.fersys-sidebar-scroll-backup', stamp)

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

function save(state) {
  const backup = path.join(backupRoot, state.rel)
  fs.mkdirSync(path.dirname(backup), { recursive: true })
  fs.copyFileSync(state.file, backup)

  const output =
    state.eol === '\r\n'
      ? state.text.replace(/\n/g, '\r\n')
      : state.text

  fs.writeFileSync(state.file, output, 'utf8')
  console.log(`✓ ${state.rel}`)
}

function replaceOnce(text, oldText, newText, label) {
  if (text.includes(newText)) return text
  if (!text.includes(oldText)) {
    throw new Error(`Nije pronađen očekivani dio: ${label}`)
  }
  return text.replace(oldText, newText)
}

function patchAppLayout() {
  const s = load('src/layouts/AppLayout.tsx')

  s.text = replaceOnce(
    s.text,
    `<div className="flex min-h-dvh bg-slate-950 text-white">`,
    `<div className="flex h-dvh overflow-hidden bg-slate-950 text-white">`,
    'AppLayout root height',
  )

  s.text = replaceOnce(
    s.text,
    `<div className="flex min-w-0 flex-1 flex-col">`,
    `<div className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">`,
    'AppLayout content column',
  )

  s.text = replaceOnce(
    s.text,
    `<main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-28 pt-3 sm:px-4 sm:pt-4 md:p-6 md:pb-6 lg:p-8">`,
    `<main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-28 pt-3 sm:px-4 sm:pt-4 md:p-6 md:pb-6 lg:p-8">`,
    'AppLayout main scroll container',
  )

  save(s)
}

function patchSidebar() {
  const s = load('src/components/Sidebar.tsx')

  const currentDesktop = `      <aside
        className={\`relative hidden min-h-dvh shrink-0 self-stretch border-r border-slate-800 bg-slate-900 text-white transition-all duration-300 md:block \${
          isExpanded
            ? 'w-72'
            : 'w-[88px]'
        }\`}
      >
        <div className="sticky top-0 flex h-dvh min-h-0 flex-col overflow-hidden">`

  const finalDesktop = `      <aside
        className={\`hidden h-dvh min-h-0 shrink-0 flex-col overflow-hidden border-r border-slate-800 bg-slate-900 text-white transition-all duration-300 md:flex \${
          isExpanded
            ? 'w-72'
            : 'w-[88px]'
        }\`}
      >`

  if (s.text.includes(currentDesktop)) {
    s.text = s.text.replace(
      currentDesktop,
      finalDesktop,
    )

    const footerClose = `        <SidebarFooter
          expanded={
            isExpanded
          }
          showSettings={can(
            'settings.manage',
          )}
          showSuperAdmin={
            isSuperAdmin
          }
          displayName={
            displayName
          }
          displayRole={
            displayRole
          }
          companyName={
            branding?.name ||
            'FERSYS tvrtka'
          }
          companyLogoUrl={
            branding?.logoUrl
          }
        />
        </div>
      </aside>`

    const footerCloseFinal = `        <SidebarFooter
          expanded={
            isExpanded
          }
          showSettings={can(
            'settings.manage',
          )}
          showSuperAdmin={
            isSuperAdmin
          }
          displayName={
            displayName
          }
          displayRole={
            displayRole
          }
          companyName={
            branding?.name ||
            'FERSYS tvrtka'
          }
          companyLogoUrl={
            branding?.logoUrl
          }
        />
      </aside>`

    s.text = replaceOnce(
      s.text,
      footerClose,
      footerCloseFinal,
      'remove desktop sticky wrapper',
    )
  }

  s.text = replaceOnce(
    s.text,
    `<nav className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 pb-5">`,
    `<nav className="fersys-scrollbar-hidden min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 pb-5">`,
    'hidden sidebar scrollbar',
  )

  save(s)
}

function patchIndexCss() {
  const s = load('src/index.css')

  if (!s.text.includes('.fersys-scrollbar-hidden')) {
    s.text += `

/* FERSYS: scroll ostaje aktivan, ali bez ružne vidljive scrollbar trake. */
.fersys-scrollbar-hidden {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.fersys-scrollbar-hidden::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}
`
  }

  save(s)
}

try {
  console.log('FERSYS sidebar / scroll FINAL fix')
  console.log(`Backup: ${backupRoot}`)

  patchAppLayout()
  patchSidebar()
  patchIndexCss()

  console.log('')
  console.log('✓ Cijeli app je sada zaključan na 100dvh.')
  console.log('✓ Samo glavni sadržaj skrola.')
  console.log('✓ Sidebar ostaje punom visinom ekrana.')
  console.log('✓ Sidebar navigacija se i dalje može skrolati, ali scrollbar nije vidljiv.')
  console.log('Sada pokreni: npm run build')
} catch (error) {
  console.error('')
  console.error(
    '✗ Patch je zaustavljen:',
    error instanceof Error ? error.message : error,
  )
  console.error(`Backup: ${backupRoot}`)
  process.exit(1)
}
