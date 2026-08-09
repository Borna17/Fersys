import fs from 'node:fs'
import path from 'node:path'

const START = process.cwd()

function findProjectRoot(start) {
  let current = path.resolve(start)

  for (let i = 0; i < 8; i += 1) {
    const packageJson = path.join(current, 'package.json')
    const srcDir = path.join(current, 'src')

    if (
      fs.existsSync(packageJson) &&
      fs.existsSync(srcDir)
    ) {
      return current
    }

    const parent = path.dirname(current)

    if (parent === current) {
      break
    }

    current = parent
  }

  return null
}

const ROOT = findProjectRoot(START)

if (!ROOT) {
  throw new Error(
    'Nisam pronašao FERSYS projekt. U terminalu prvo otvori Fersys mapu pa ponovno pokreni ovu skriptu.',
  )
}

const SRC = path.join(ROOT, 'src')

console.log('')
console.log('FERSYS projekt:', ROOT)
console.log('')

const textExtensions = new Set([
  '.ts',
  '.tsx',
])

const replacements = [
  ['Kupcima', 'Investitorima'],
  ['kupcima', 'investitorima'],
  ['Kupaca', 'Investitora'],
  ['kupaca', 'investitora'],
  ['Kupcem', 'Investitorom'],
  ['kupcem', 'investitorom'],
  ['Kupcu', 'Investitoru'],
  ['kupcu', 'investitoru'],
  ['Kupca', 'Investitora'],
  ['kupca', 'investitora'],
  ['Kupci', 'Investitori'],
  ['kupci', 'investitori'],
  ['Kupac', 'Investitor'],
  ['kupac', 'investitor'],
]

function walk(directory) {
  const result = []

  for (
    const entry of fs.readdirSync(
      directory,
      { withFileTypes: true },
    )
  ) {
    const fullPath = path.join(
      directory,
      entry.name,
    )

    if (entry.isDirectory()) {
      result.push(...walk(fullPath))
      continue
    }

    if (
      textExtensions.has(
        path.extname(entry.name),
      )
    ) {
      result.push(fullPath)
    }
  }

  return result
}

function replaceCroatianUiTerms(source) {
  let next = source

  for (const [from, to] of replacements) {
    next = next.split(from).join(to)
  }

  return next
}

function patchNewInvoicePage(source) {
  let next = source

  next = next.replace(
    "import { useMemo, useState } from 'react'",
    "import { useEffect, useMemo, useState } from 'react'",
  )

  if (
    !next.includes(
      "from '../services/customers.service'",
    )
  ) {
    next = next.replace(
      "import { openInvoicePdf } from '../utils/invoicePdf'",
      "import { openInvoicePdf } from '../utils/invoicePdf'\nimport { getCustomers } from '../services/customers.service'\nimport type { Customer as CompanyCustomer } from '../types/customer'",
    )
  }

  if (
    !next.includes(
      'function mapCompanyCustomerType(',
    )
  ) {
    next = next.replace(
      'function customerIcon(type: CustomerType) {',
      `function mapCompanyCustomerType(
  type: CompanyCustomer['type'],
): CustomerType {
  if (type === 'company') {
    return 'Tvrtka'
  }

  if (type === 'building') {
    return 'Zgrada'
  }

  return 'Fizička osoba'
}

function customerIcon(type: CustomerType) {`,
    )
  }

  if (
    !next.includes(
      'const [companyCustomers, setCompanyCustomers]',
    )
  ) {
    next = next.replace(
      '  const [showCustomers, setShowCustomers] = useState(false)',
      `  const [showCustomers, setShowCustomers] = useState(false)

  const [
    companyCustomers,
    setCompanyCustomers,
  ] = useState<CompanyCustomer[]>([])

  const [
    customerLoadError,
    setCustomerLoadError,
  ] = useState('')`,
    )
  }

  if (
    !next.includes(
      'async function loadCompanyCustomers()',
    )
  ) {
    next = next.replace(
      '  const customerSuggestions = useMemo(() => {',
      `  useEffect(() => {
    let cancelled = false

    async function loadCompanyCustomers() {
      try {
        setCustomerLoadError('')

        const savedCustomers =
          await getCustomers()

        if (!cancelled) {
          setCompanyCustomers(
            savedCustomers.filter(
              (customer) =>
                customer.status ===
                'Aktivan',
            ),
          )
        }
      } catch (error) {
        console.error(
          'Investitore nije moguće učitati:',
          error,
        )

        if (!cancelled) {
          setCustomerLoadError(
            error instanceof Error
              ? error.message
              : 'Investitore nije moguće učitati.',
          )
        }
      }
    }

    void loadCompanyCustomers()

    return () => {
      cancelled = true
    }
  }, [])

  const customerSuggestions = useMemo(() => {`,
    )
  }

  if (
    !next.includes(
      'companyCustomers.forEach(',
    )
  ) {
    next = next.replace(
      '    storedInvoices.forEach((invoice) =>',
      `    companyCustomers.forEach(
      (customer) =>
        addCustomer({
          name: customer.name,
          type:
            mapCompanyCustomerType(
              customer.type,
            ),
          oib: customer.oib,
          email: customer.email,
          phone: customer.phone,
          address: [
            customer.street,
            [
              customer.postalCode,
              customer.city,
            ]
              .filter(Boolean)
              .join(' '),
          ]
            .filter(Boolean)
            .join(', '),
          city: customer.city,
        }),
    )

    storedInvoices.forEach((invoice) =>`,
    )
  }

  next = next.replace(
    '  }, [storedInvoices, storedOffers])',
    '  }, [companyCustomers, storedInvoices, storedOffers])',
  )

  next = next.replace(
    "'Unesi ili odaberi kupca.'",
    "'Unesi ili odaberi investitora.'",
  )

  if (
    !next.includes(
      '{customerLoadError && (',
    )
  ) {
    const marker =
      '              {errors.customerName && ('

    if (next.includes(marker)) {
      next = next.replace(
        marker,
        `              {customerLoadError && (
                <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300">
                  {customerLoadError}
                </div>
              )}

${marker}`,
      )
    }
  }

  return next
}

const files = walk(SRC)
const changed = []

for (const file of files) {
  const before =
    fs.readFileSync(file, 'utf8')

  let after = before

  if (
    file.endsWith(
      path.join(
        'pages',
        'NewInvoicePage.tsx',
      ),
    )
  ) {
    after = patchNewInvoicePage(after)
  }

  after = replaceCroatianUiTerms(after)

  if (after !== before) {
    fs.writeFileSync(
      file,
      after,
      'utf8',
    )

    changed.push(
      path.relative(ROOT, file),
    )
  }
}

const sidebarPath =
  path.join(
    SRC,
    'components',
    'Sidebar.tsx',
  )

const invoicePath =
  path.join(
    SRC,
    'pages',
    'NewInvoicePage.tsx',
  )

const sidebar =
  fs.readFileSync(
    sidebarPath,
    'utf8',
  )

const invoice =
  fs.readFileSync(
    invoicePath,
    'utf8',
  )

const checks = [
  {
    ok:
      sidebar.includes(
        "name: 'Investitori'",
      ),
    message:
      'Sidebar nije promijenjen na Investitori.',
  },
  {
    ok:
      invoice.includes(
        "from '../services/customers.service'",
      ),
    message:
      'NewInvoicePage nije povezan s customers.service.ts.',
  },
  {
    ok:
      invoice.includes(
        'companyCustomers.forEach(',
      ),
    message:
      'NewInvoicePage ne dodaje stvarne investitore u prijedloge.',
  },
  {
    ok:
      invoice.includes(
        'await getCustomers()',
      ),
    message:
      'NewInvoicePage ne učitava investitore iz Supabasea.',
  },
]

const failed =
  checks.filter(
    (check) => !check.ok,
  )

console.log(
  `Promijenjeno datoteka: ${changed.length}`,
)

for (const file of changed) {
  console.log('-', file)
}

console.log('')

if (failed.length > 0) {
  for (const check of failed) {
    console.error(
      'GREŠKA:',
      check.message,
    )
  }

  process.exit(1)
}

console.log(
  '✅ Sidebar: Investitori',
)
console.log(
  '✅ UI tekstovi: Kupac → Investitor',
)
console.log(
  '✅ Izlazni račun: učitava stvarne investitore iz Supabasea',
)
console.log(
  '✅ Interni customer* nazivi i /customers ruta ostali su nepromijenjeni',
)
console.log('')
console.log(
  'Sada pokreni: npm run build',
)
