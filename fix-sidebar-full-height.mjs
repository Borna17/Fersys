import fs from 'node:fs'
import path from 'node:path'

const rel = 'src/components/Sidebar.tsx'
const file = path.join(process.cwd(), rel)
if (!fs.existsSync(file)) {
  console.error(`Nije pronađen ${rel}`)
  process.exit(1)
}

let text = fs.readFileSync(file, 'utf8')
const eol = text.includes('\r\n') ? '\r\n' : '\n'
text = text.replace(/\r\n/g, '\n')

const oldAside = `      <aside
        className={\`sticky top-0 hidden h-dvh min-h-0 shrink-0 self-start flex-col overflow-hidden border-r border-slate-800 bg-slate-900 text-white transition-all duration-300 md:flex \${
          isExpanded
            ? 'w-72'
            : 'w-[88px]'
        }\`}
      >`

const newAside = `      <aside
        className={\`relative hidden min-h-dvh shrink-0 self-stretch border-r border-slate-800 bg-slate-900 text-white transition-all duration-300 md:block \${
          isExpanded
            ? 'w-72'
            : 'w-[88px]'
        }\`}
      >
        <div className="sticky top-0 flex h-dvh min-h-0 flex-col overflow-hidden">`

if (!text.includes(newAside)) {
  if (!text.includes(oldAside)) {
    console.error('Nisam pronašao desktop Sidebar blok.')
    process.exit(1)
  }
  text = text.replace(oldAside, newAside)

  const closeAnchor = `        <SidebarFooter
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

  const closeReplacement = `        <SidebarFooter
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

  if (!text.includes(closeAnchor)) {
    console.error('Nisam pronašao kraj desktop Sidebara.')
    process.exit(1)
  }
  text = text.replace(closeAnchor, closeReplacement)
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backup = path.join(process.cwd(), '.fersys-sidebar-full-height-backup', stamp, rel)
fs.mkdirSync(path.dirname(backup), { recursive: true })
fs.copyFileSync(file, backup)

fs.writeFileSync(
  file,
  eol === '\r\n' ? text.replace(/\n/g, '\r\n') : text,
  'utf8',
)

console.log('✓ Sidebar background ide do dna cijele stranice.')
console.log('✓ Unutarnja navigacija ostaje sticky dok skrolaš.')
console.log('✓ Mobile sidebar nije diran.')
console.log('Sada pokreni: npm run build')

