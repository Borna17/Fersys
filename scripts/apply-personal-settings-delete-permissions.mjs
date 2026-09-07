import fs from 'node:fs'

function patchFile(path, patches) {
  let source = fs.readFileSync(path, 'utf8')
  for (const [from, to] of patches) {
    if (!source.includes(from)) {
      if (source.includes(to)) continue
      throw new Error(`Expected fragment not found in ${path}: ${from.slice(0, 120)}`)
    }
    source = source.replace(from, to)
  }
  fs.writeFileSync(path, source)
}

patchFile('src/auth/permissions.ts', [
  [
    "  | 'customers.manage'\r\n\r\n  | 'workOrders.view'",
    "  | 'customers.manage'\r\n  | 'customers.delete'\r\n\r\n  | 'workOrders.view'",
  ],
  [
    "  | 'workOrders.viewPrices'\r\n\r\n  | 'offers.view'",
    "  | 'workOrders.viewPrices'\r\n  | 'workOrders.delete'\r\n\r\n  | 'offers.view'",
  ],
  [
    "  | 'offers.viewPrices'\r\n\r\n  | 'invoices.view'\r\n  | 'incomingInvoices.view'",
    "  | 'offers.viewPrices'\r\n  | 'offers.delete'\r\n\r\n  | 'invoices.view'\r\n  | 'invoices.delete'\r\n  | 'incomingInvoices.view'\r\n  | 'incomingInvoices.delete'",
  ],
  [
    "  | 'inventory.viewCosts'\r\n\r\n  | 'vehicles.view'",
    "  | 'inventory.viewCosts'\r\n  | 'inventory.delete'\r\n  | 'deliveryNotes.delete'\r\n\r\n  | 'vehicles.view'",
  ],
  [
    "  | 'vehicles.manage'\r\n\r\n  | 'calendar.view'",
    "  | 'vehicles.manage'\r\n  | 'vehicles.delete'\r\n\r\n  | 'calendar.view'",
  ],
  [
    "  | 'calendar.view'\r\n\r\n  | 'employees.view'",
    "  | 'calendar.view'\r\n  | 'calendar.delete'\r\n\r\n  | 'employees.view'",
  ],
  [
    "  | 'employees.manage'\r\n\r\n  | 'ai.use'",
    "  | 'employees.manage'\r\n  | 'employees.delete'\r\n\r\n  | 'ai.use'",
  ],
  [
    "  'customers.manage',\r\n\r\n  'workOrders.view'",
    "  'customers.manage',\r\n  'customers.delete',\r\n\r\n  'workOrders.view'",
  ],
  [
    "  'workOrders.viewPrices',\r\n\r\n  'offers.view'",
    "  'workOrders.viewPrices',\r\n  'workOrders.delete',\r\n\r\n  'offers.view'",
  ],
  [
    "  'offers.viewPrices',\r\n\r\n  'invoices.view',\r\n  'incomingInvoices.view',",
    "  'offers.viewPrices',\r\n  'offers.delete',\r\n\r\n  'invoices.view',\r\n  'invoices.delete',\r\n  'incomingInvoices.view',\r\n  'incomingInvoices.delete',",
  ],
  [
    "  'inventory.viewCosts',\r\n\r\n  'vehicles.view'",
    "  'inventory.viewCosts',\r\n  'inventory.delete',\r\n  'deliveryNotes.delete',\r\n\r\n  'vehicles.view'",
  ],
  [
    "  'vehicles.manage',\r\n\r\n  'calendar.view'",
    "  'vehicles.manage',\r\n  'vehicles.delete',\r\n\r\n  'calendar.view'",
  ],
  [
    "  'calendar.view',\r\n\r\n  'employees.view'",
    "  'calendar.view',\r\n  'calendar.delete',\r\n\r\n  'employees.view'",
  ],
  [
    "  'employees.manage',\r\n\r\n  'ai.use'",
    "  'employees.manage',\r\n  'employees.delete',\r\n\r\n  'ai.use'",
  ],
  [
    "  admin:\r\n    createPermissions(\r\n      allPermissions,\r\n    ),",
    "  admin:\r\n    createPermissions(\r\n      allPermissions.filter(\r\n        (permission) =>\r\n          !permission.endsWith('.delete'),\r\n      ),\r\n    ),",
  ],
  [
    "  'customers.manage':\r\n    'Dodavanje i uređivanje investitora',",
    "  'customers.manage':\r\n    'Dodavanje i uređivanje investitora',\r\n\r\n  'customers.delete':\r\n    'Brisanje investitora',",
  ],
  [
    "  'workOrders.viewPrices':\r\n    'Pregled cijena radnih naloga',",
    "  'workOrders.viewPrices':\r\n    'Pregled cijena radnih naloga',\r\n\r\n  'workOrders.delete':\r\n    'Brisanje radnih naloga',",
  ],
  [
    "  'offers.viewPrices':\r\n    'Pregled cijena ponuda',",
    "  'offers.viewPrices':\r\n    'Pregled cijena ponuda',\r\n\r\n  'offers.delete':\r\n    'Brisanje ponuda',",
  ],
  [
    "  'invoices.view':\r\n    'Računi',\r\n\r\n  'incomingInvoices.view':\r\n    'Ulazni računi',",
    "  'invoices.view':\r\n    'Računi',\r\n\r\n  'invoices.delete':\r\n    'Brisanje izlaznih računa',\r\n\r\n  'incomingInvoices.view':\r\n    'Ulazni računi',\r\n\r\n  'incomingInvoices.delete':\r\n    'Brisanje ulaznih računa',",
  ],
  [
    "  'inventory.viewCosts':\r\n    'Pregled nabavnih cijena',",
    "  'inventory.viewCosts':\r\n    'Pregled nabavnih cijena',\r\n\r\n  'inventory.delete':\r\n    'Brisanje artikala skladišta',\r\n\r\n  'deliveryNotes.delete':\r\n    'Brisanje otpremnica',",
  ],
  [
    "  'vehicles.manage':\r\n    'Dodavanje i uređivanje vozila',",
    "  'vehicles.manage':\r\n    'Dodavanje i uređivanje vozila',\r\n\r\n  'vehicles.delete':\r\n    'Brisanje vozila',",
  ],
  [
    "  'calendar.view':\r\n    'Kalendar',",
    "  'calendar.view':\r\n    'Kalendar',\r\n\r\n  'calendar.delete':\r\n    'Brisanje događaja iz kalendara',",
  ],
  [
    "  'employees.manage':\r\n    'Upravljanje zaposlenicima',",
    "  'employees.manage':\r\n    'Upravljanje zaposlenicima',\r\n\r\n  'employees.delete':\r\n    'Uklanjanje zaposlenika',",
  ],
])

patchFile('src/pages/EmployeesPage.tsx', [
  [
    "      'customers.manage',\r\n      'calendar.view',",
    "      'customers.manage',\r\n      'customers.delete',\r\n      'calendar.view',\r\n      'calendar.delete',",
  ],
  [
    "      'workOrders.viewPrices',\r\n    ],",
    "      'workOrders.viewPrices',\r\n      'workOrders.delete',\r\n    ],",
  ],
  [
    "      'offers.viewPrices',\r\n      'invoices.view',\r\n      'incomingInvoices.view',",
    "      'offers.viewPrices',\r\n      'offers.delete',\r\n      'invoices.view',\r\n      'invoices.delete',\r\n      'incomingInvoices.view',\r\n      'incomingInvoices.delete',",
  ],
  [
    "      'inventory.viewCosts',\r\n    ],",
    "      'inventory.viewCosts',\r\n      'inventory.delete',\r\n      'deliveryNotes.delete',\r\n    ],",
  ],
  [
    "      'vehicles.manage',\r\n    ],",
    "      'vehicles.manage',\r\n      'vehicles.delete',\r\n    ],",
  ],
  [
    "      'employees.manage',\r\n      'ai.use',",
    "      'employees.manage',\r\n      'employees.delete',\r\n      'ai.use',",
  ],
])

patchFile('src/components/Sidebar.tsx', [
  [
    "      {showSettings && (\n        <NavLink\n          to=\"/settings\"",
    "      <NavLink\n        to=\"/account\"\n        title={!expanded ? 'Moje postavke' : undefined}\n        className={({ isActive }) =>\n          `mb-3 flex h-12 items-center rounded-xl transition ${\n            expanded ? 'gap-3 px-4' : 'justify-center'\n          } ${\n            isActive\n              ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/30'\n              : 'text-slate-400 hover:bg-slate-800 hover:text-white'\n          }`\n        }\n      >\n        <Settings size={21} className=\"shrink-0\" />\n        {expanded && <span className=\"text-sm font-semibold\">Moje postavke</span>}\n      </NavLink>\n\n      {showSettings && (\n        <NavLink\n          to=\"/settings\"",
  ],
  [
    "              ? 'Postavke'\n              : undefined",
    "              ? 'Postavke firme'\n              : undefined",
  ],
  [
    "              Postavke\n            </span>",
    "              Postavke firme\n            </span>",
  ],
])

console.log('Applied personal settings and granular delete permission framework.')
