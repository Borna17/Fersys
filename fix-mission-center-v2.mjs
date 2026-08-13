import fs from 'node:fs'
import path from 'node:path'

const rel = 'src/components/MissionCenter.tsx'
const file = path.join(process.cwd(), rel)
if (!fs.existsSync(file)) {
  console.error(`Nije pronađen ${rel}`)
  process.exit(1)
}

let text = fs.readFileSync(file, 'utf8')
const eol = text.includes('\r\n') ? '\r\n' : '\n'

// Backup
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backup = path.join(process.cwd(), '.fersys-mission-fix-backup', stamp, rel)
fs.mkdirSync(path.dirname(backup), { recursive: true })
fs.copyFileSync(file, backup)

// 1) Zamijeni Promise.all blok regexom neovisno o CRLF/LF i razmacima.
const loadRegex = /const \[customers, orders, offers, employees, calendar, inventory, flags\] =\s*await Promise\.all\(\[\s*getCustomers\(\), getWorkOrders\(\), getOffers\(\), getEmployees\(\),\s*getCalendarEventCount\(\), getInventoryItemCount\(\), getMissionFlags\(\),\s*\]\)\s*\n\s*if \(!cancelled\) \{\s*setData\(\{\s*customers: customers\.length,\s*orders: orders\.length,\s*offers: offers\.length,\s*employees: employees\.length,\s*calendar,\s*inventory,\s*aiOpened: flags\.aiOpened,\s*celebrationSeen: flags\.celebrationSeen,\s*\}\)\s*\}/m

const newLoad = `const results = await Promise.allSettled([${eol}          getCustomers(),${eol}          getWorkOrders(),${eol}          getOffers(),${eol}          getEmployees(),${eol}          getCalendarEventCount(),${eol}          getInventoryItemCount(),${eol}          getMissionFlags(),${eol}        ])${eol}${eol}        if (!cancelled) {${eol}          const readResult = <T,>(index: number, fallback: T): T => {${eol}            const result = results[index]${eol}${eol}            if (result?.status === 'fulfilled') {${eol}              return result.value${eol}            }${eol}${eol}            if (result?.status === 'rejected') {${eol}              console.error('Mission Center task load:', result.reason)${eol}            }${eol}${eol}            return fallback${eol}          }${eol}${eol}          const customers = readResult(0, [])${eol}          const orders = readResult(1, [])${eol}          const offers = readResult(2, [])${eol}          const employees = readResult(3, [])${eol}          const calendar = readResult(4, 0)${eol}          const inventory = readResult(5, 0)${eol}          const flags = readResult(6, {${eol}            aiOpened: false,${eol}            celebrationSeen: false,${eol}          })${eol}${eol}          setData({${eol}            customers: Array.isArray(customers) ? customers.length : 0,${eol}            orders: Array.isArray(orders) ? orders.length : 0,${eol}            offers: Array.isArray(offers) ? offers.length : 0,${eol}            employees: Array.isArray(employees) ? employees.length : 0,${eol}            calendar: Number(calendar) || 0,${eol}            inventory: Number(inventory) || 0,${eol}            aiOpened: Boolean(flags?.aiOpened),${eol}            celebrationSeen: Boolean(flags?.celebrationSeen),${eol}          })${eol}        }`

if (!text.includes('Promise.allSettled([')) {
  const next = text.replace(/\r\n/g, '\n').replace(loadRegex, newLoad.replace(/\r\n/g,'\n'))
  if (next === text.replace(/\r\n/g,'\n')) {
    console.error('Nisam uspio pronaći load blok ni regexom.')
    process.exit(1)
  }
  text = eol === '\r\n' ? next.replace(/\n/g,'\r\n') : next
}

// 2) Refresh listeners - tolerant regex
if (!text.includes("window.addEventListener('pageshow'")) {
  const normalized = text.replace(/\r\n/g,'\n')
  const refreshRegex = /void load\(\)\n\s*window\.addEventListener\('focus', load\)\n\s*window\.addEventListener\('fersys:mission-refresh', load\)\n\s*\n\s*return \(\) => \{\n\s*cancelled = true\n\s*window\.removeEventListener\('focus', load\)\n\s*window\.removeEventListener\('fersys:mission-refresh', load\)\n\s*\}/m
  const replacement = `void load()\n\n    const refresh = () => {\n      void load()\n    }\n\n    window.addEventListener('focus', refresh)\n    window.addEventListener('pageshow', refresh)\n    window.addEventListener('storage', refresh)\n    window.addEventListener('fersys:mission-refresh', refresh)\n\n    return () => {\n      cancelled = true\n      window.removeEventListener('focus', refresh)\n      window.removeEventListener('pageshow', refresh)\n      window.removeEventListener('storage', refresh)\n      window.removeEventListener('fersys:mission-refresh', refresh)\n    }`
  const next = normalized.replace(refreshRegex, replacement)
  if (next === normalized) {
    console.error('Nisam uspio pronaći refresh blok.')
    process.exit(1)
  }
  text = eol === '\r\n' ? next.replace(/\n/g,'\r\n') : next
}

fs.writeFileSync(file, text, 'utf8')
console.log('✓ MissionCenter.tsx popravljen.')
console.log('✓ Radi i s CRLF i s LF formatom datoteke.')
console.log('Sada pokreni: npm run build')
