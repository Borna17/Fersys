import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd(), 'src')

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
  const entries =
    fs.readdirSync(
      directory,
      {
        withFileTypes: true,
      },
    )

  const files = []

  for (const entry of entries) {
    const fullPath =
      path.join(
        directory,
        entry.name,
      )

    if (entry.isDirectory()) {
      files.push(
        ...walk(fullPath),
      )
      continue
    }

    if (
      textExtensions.has(
        path.extname(
          entry.name,
        ),
      )
    ) {
      files.push(fullPath)
    }
  }

  return files
}

function replaceVisibleCroatianTerms(
  source,
) {
  let next = source

  for (
    const [
      from,
      to,
    ] of replacements
  ) {
    next =
      next.split(from).join(to)
  }

  return next
}

function patchNewInvoicePage(
  source,
) {
  let next = source

  // useEffect
  next = next.replace(
    "import { useMemo, useState } from 'react'",
    "import { useEffect, useMemo, useState } from 'react'",
  )

  // Supabase investitori
  if (
    !next.includes(
      "from '../services/customers.service'",
    )
  ) {
    next = next.replace(
      "import { openInvoicePdf } from '../utils/invoicePdf'",
      `import { openInvoicePdf } from '../utils/invoicePdf'
import { getCustomers } from '../services/customers.service'
import type { Customer as CompanyCustomer } from '../types/customer'`,
    )
  }

  // mapper
  if (
    !next.includes(
      'function mapCompanyCustomerType(',
    )
  ) {
    const marker =
      "function customerIcon(type: CustomerType) {"

    const mapper = `function mapCompanyCustomerType(
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

`

    next =
      next.replace(
        marker,
        mapper + marker,
      )
  }

  // state
  if (
    !next.includes(
      'const [companyCustomers, setCompanyCustomers]',
    )
  ) {
    const marker =
      "  const [showCustomers, setShowCustomers] = useState(false)\n"

    const state = `  const [
    companyCustomers,
    setCompanyCustomers,
  ] = useState<CompanyCustomer[]>([])

  const [
    customerLoadError,
    setCustomerLoadError,
  ] = useState('')

`

    next =
      next.replace(
        marker,
        marker + state,
      )
  }

  // load effect
  if (
    !next.includes(
      'async function loadCompanyCustomers()',
    )
  ) {
    const marker =
      "  const customerSuggestions = useMemo(() => {\n"

    const effect = `  useEffect(() => {
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

`

    next =
      next.replace(
        marker,
        effect + marker,
      )
  }

  // Add database customers into suggestions
  if (
    !next.includes(
      'companyCustomers.forEach((customer) =>',
    )
  ) {
    const marker =
      "    storedInvoices.forEach((invoice) =>\n"

    const databaseCustomers = `    companyCustomers.forEach(
      (customer) =>
        addCustomer({
          name:
            customer.name,

          type:
            mapCompanyCustomerType(
              customer.type,
            ),

          oib:
            customer.oib,

          email:
            customer.email,

          phone:
            customer.phone,

          address:
            [
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

          city:
            customer.city,
        }),
    )

`

    next =
      next.replace(
        marker,
        databaseCustomers +
          marker,
      )
  }

  // useMemo dependency
  next = next.replace(
    "  }, [storedInvoices, storedOffers])",
    "  }, [companyCustomers, storedInvoices, storedOffers])",
  )

  // Display load warning below search field if needed
  if (
    !next.includes(
      '{customerLoadError && (',
    )
  ) {
    const marker =
      "              {errors.customerName && (\n"

    const warning = `              {customerLoadError && (
                <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300">
                  {customerLoadError}
                </div>
              )}

`

    next =
      next.replace(
        marker,
        warning + marker,
      )
  }

  return next
}

if (!fs.existsSync(ROOT)) {
  throw new Error(
    `Nisam pronašao src mapu: ${ROOT}`,
  )
}

const files = walk(ROOT)
const changed = []

for (const file of files) {
  const before =
    fs.readFileSync(
      file,
      'utf8',
    )

  let after = before

  if (
    file.endsWith(
      `${path.sep}pages${path.sep}NewInvoicePage.tsx`,
    )
  ) {
    after =
      patchNewInvoicePage(
        after,
      )
  }

  after =
    replaceVisibleCroatianTerms(
      after,
    )

  if (after !== before) {
    fs.writeFileSync(
      file,
      after,
      'utf8',
    )

    changed.push(
      path.relative(
        process.cwd(),
        file,
      ),
    )
  }
}

console.log('')
console.log(
  `Gotovo. Promijenjeno datoteka: ${changed.length}`,
)
console.log('')

for (const file of changed) {
  console.log(`- ${file}`)
}

console.log('')
console.log(
  'Interni nazivi customer*, ruta /customers i Supabase tablica customers nisu mijenjani.',
)
console.log(
  'To je namjerno radi kompatibilnosti postojećih podataka i funkcija.',
)
