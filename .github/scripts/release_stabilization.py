from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if new in text:
        print(f'{path}: already patched')
        return
    if old not in text:
        raise SystemExit(f'{path}: expected block not found')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')
    print(f'{path}: patched')

# PWA installed-app identity.
replace_once(
    'vite.config.ts',
    "        name: 'FERSYS',\n        short_name: 'FERSYS',",
    "        name: 'FERSYS Business',\n        short_name: 'FERSYS Business',",
)

# Vehicle fuel metadata.
replace_once(
    'src/types/vehicle.ts',
    "  mileage: number | null\n  createdAt: string\n}",
    "  mileage: number | null\n  fuelLiters: number | null\n  fuelUnitPrice: number | null\n  sourceInvoiceId: string\n  sourceInvoiceNumber: string\n  createdAt: string\n}",
)

replace_once(
    'src/services/vehicles.service.ts',
    "  mileage: number | null\n  created_at: string\n}",
    "  mileage: number | null\n  fuel_liters: number | null\n  fuel_unit_price: number | null\n  source_invoice_id: string | null\n  source_invoice_number: string | null\n  created_at: string\n}",
)
replace_once(
    'src/services/vehicles.service.ts',
    "  mileage?: number | null\n}\n\nfunction mapVehicle",
    "  mileage?: number | null\n  fuelLiters?: number | null\n  fuelUnitPrice?: number | null\n  sourceInvoiceId?: string\n  sourceInvoiceNumber?: string\n}\n\nfunction mapVehicle",
)
replace_once(
    'src/services/vehicles.service.ts',
    "    mileage: row.mileage,\n    createdAt: row.created_at,",
    "    mileage: row.mileage,\n    fuelLiters: row.fuel_liters === null ? null : Number(row.fuel_liters),\n    fuelUnitPrice: row.fuel_unit_price === null ? null : Number(row.fuel_unit_price),\n    sourceInvoiceId: row.source_invoice_id ?? '',\n    sourceInvoiceNumber: row.source_invoice_number ?? '',\n    createdAt: row.created_at,",
)
replace_once(
    'src/services/vehicles.service.ts',
    "        mileage:\n          input.mileage ??\n          null,\n      })",
    "        mileage:\n          input.mileage ??\n          null,\n        fuel_liters:\n          input.fuelLiters ?? null,\n        fuel_unit_price:\n          input.fuelUnitPrice ?? null,\n        source_invoice_id:\n          input.sourceInvoiceId?.trim() || null,\n        source_invoice_number:\n          input.sourceInvoiceNumber?.trim() || null,\n      })",
)

# AI response carries exact fuel information only when present on the receipt.
replace_once(
    'src/services/incomingInvoiceAi.service.ts',
    "  vehicleMatchReason?: string\n}",
    "  vehicleMatchReason?: string\n  fuelLiters?: number\n  fuelUnitPrice?: number\n  vehicleMileage?: number\n}",
)
replace_once(
    'src/services/incomingInvoiceAi.service.ts',
    "  reason?: string\n}",
    "  reason?: string\n  fuelLiters?: number\n  fuelUnitPrice?: number\n  mileage?: number\n}",
)
replace_once(
    'src/services/incomingInvoiceAi.service.ts',
    "    vehicleMatchReason:\n      vehicle?.reason ?? '',\n  }",
    "    vehicleMatchReason:\n      vehicle?.reason ?? '',\n    fuelLiters: Math.max(0, Number(vehicle?.fuelLiters ?? 0)),\n    fuelUnitPrice: Math.max(0, Number(vehicle?.fuelUnitPrice ?? 0)),\n    vehicleMileage: Math.max(0, Math.round(Number(vehicle?.mileage ?? 0))),\n  }",
)

# Carry AI vehicle/fuel details into the saved vehicle expense.
replace_once(
    'src/pages/NewIncomingInvoicePage.tsx',
    "    confidence: number\n  } | null>(null)",
    "    confidence: number\n    fuelLiters: number\n    fuelUnitPrice: number\n    mileage: number\n  } | null>(null)",
)
replace_once(
    'src/pages/NewIncomingInvoicePage.tsx',
    "        confidence: vehicleConfidence,\n      })",
    "        confidence: vehicleConfidence,\n        fuelLiters: Math.max(0, Number(result.fuelLiters ?? 0)),\n        fuelUnitPrice: Math.max(0, Number(result.fuelUnitPrice ?? 0)),\n        mileage: Math.max(0, Math.round(Number(result.vehicleMileage ?? 0))),\n      })",
)
replace_once(
    'src/pages/NewIncomingInvoicePage.tsx',
    "            amount: saved.totalAmount,\n            mileage: null,",
    "            amount: saved.totalAmount,\n            mileage: aiVehicleMatch.mileage > 0 ? aiVehicleMatch.mileage : null,\n            fuelLiters: aiVehicleMatch.category === 'Gorivo' && aiVehicleMatch.fuelLiters > 0 ? aiVehicleMatch.fuelLiters : null,\n            fuelUnitPrice: aiVehicleMatch.category === 'Gorivo' && aiVehicleMatch.fuelUnitPrice > 0 ? aiVehicleMatch.fuelUnitPrice : null,\n            sourceInvoiceId: saved.id,\n            sourceInvoiceNumber: saved.invoiceNumber,",
)

# Show recognized fuel quantity / unit price on vehicle history.
replace_once(
    'src/pages/VehicleDetailsPage.tsx',
    "                      <span className=\"text-sm text-slate-300\">\n                        {expense.description ||\n                          '—'}\n                      </span>",
    "                      <span className=\"text-sm text-slate-300\">\n                        {expense.description || '—'}\n                        {expense.category === 'Gorivo' && expense.fuelLiters !== null && (\n                          <span className=\"mt-1 block text-xs text-slate-500\">\n                            {expense.fuelLiters.toLocaleString('hr-HR', { maximumFractionDigits: 2 })} L\n                            {expense.fuelUnitPrice !== null\n                              ? ` · ${money(expense.fuelUnitPrice)}/L`\n                              : ''}\n                            {expense.mileage !== null\n                              ? ` · ${mileage(expense.mileage)}`\n                              : ''}\n                          </span>\n                        )}\n                      </span>",
)

# Drafts are already IndexedDB-first; also sync on normal app start and periodically while online.
replace_once(
    'src/components/ConnectionStatusNotice.tsx',
    "    if (!navigator.onLine) {\n      handleOffline()\n    }\n\n    return () => {",
    "    if (!navigator.onLine) {\n      handleOffline()\n    } else {\n      void syncPendingUserDrafts().catch((error) => {\n        console.warn('Početna sinkronizacija nacrta nije uspjela:', error)\n      })\n    }\n\n    const syncInterval = window.setInterval(() => {\n      if (navigator.onLine && document.visibilityState === 'visible') {\n        void syncPendingUserDrafts().catch((error) => {\n          console.warn('Periodična sinkronizacija nacrta nije uspjela:', error)\n        })\n      }\n    }, 2 * 60 * 1000)\n\n    return () => {\n      window.clearInterval(syncInterval)",
)

print('Release stabilization patch complete.')
