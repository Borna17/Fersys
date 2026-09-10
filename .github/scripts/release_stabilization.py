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

# Delivery notes used a single overflow-hidden A4 canvas. Allow tall content and split it into
# multiple A4 pages at safe block/row boundaries so long documents are never clipped.
replace_once(
    'src/utils/deliveryNotePdf.ts',
    "    background: ${appearance.backgroundColor};\n    overflow: hidden;\n  }",
    "    background: ${appearance.backgroundColor};\n    overflow: visible;\n  }",
)
replace_once(
    'src/utils/deliveryNotePdf.ts',
    "    pdf.addImage(\n      canvas.toDataURL(\n        'image/jpeg',\n        0.92,\n      ),\n      'JPEG',\n      0,\n      0,\n      210,\n      297,\n      undefined,\n      'FAST',\n    )\n\n    return pdf.output(\n      'blob',\n    )",
    "    const a4PageHeightPx =\n      canvas.width * (297 / 210)\n    const pageRect =\n      page.getBoundingClientRect()\n    const canvasScaleY =\n      canvas.height / Math.max(1, page.scrollHeight)\n    const safeBreaks =\n      Array.from(\n        page.querySelectorAll(\n          'tr, .note, .signatures, .info-grid',\n        ),\n      )\n        .map((element) => {\n          const rect =\n            (element as HTMLElement).getBoundingClientRect()\n          return Math.round(\n            (rect.bottom - pageRect.top) * canvasScaleY,\n          )\n        })\n        .filter((value) =>\n          value > 0 && value < canvas.height,\n        )\n        .sort((a, b) => a - b)\n\n    let startY = 0\n    let outputPage = 0\n\n    while (startY < canvas.height - 2) {\n      const naturalEnd =\n        Math.min(\n          canvas.height,\n          startY + a4PageHeightPx,\n        )\n      let endY = naturalEnd\n\n      if (naturalEnd < canvas.height) {\n        const minUsefulEnd =\n          startY + a4PageHeightPx * 0.62\n        const candidates =\n          safeBreaks.filter(\n            (value) =>\n              value >= minUsefulEnd &&\n              value <= naturalEnd - 12,\n          )\n        if (candidates.length) {\n          endY = candidates[candidates.length - 1]\n        }\n      }\n\n      if (endY <= startY + 10) {\n        endY = naturalEnd\n      }\n\n      const sliceHeight =\n        Math.max(1, Math.round(endY - startY))\n      const slice =\n        document.createElement('canvas')\n      slice.width = canvas.width\n      slice.height = sliceHeight\n      const context = slice.getContext('2d')\n      if (!context) {\n        throw new Error('PDF stranicu nije moguće pripremiti.')\n      }\n      context.fillStyle = '#ffffff'\n      context.fillRect(0, 0, slice.width, slice.height)\n      context.drawImage(\n        canvas,\n        0,\n        Math.round(startY),\n        canvas.width,\n        sliceHeight,\n        0,\n        0,\n        canvas.width,\n        sliceHeight,\n      )\n\n      if (outputPage > 0) {\n        pdf.addPage('a4', 'portrait')\n      }\n      const renderedHeightMm =\n        Math.min(297, sliceHeight * (210 / canvas.width))\n      pdf.addImage(\n        slice.toDataURL('image/jpeg', 0.92),\n        'JPEG',\n        0,\n        0,\n        210,\n        renderedHeightMm,\n        undefined,\n        'FAST',\n      )\n\n      outputPage += 1\n      startY = endY\n    }\n\n    return pdf.output(\n      'blob',\n    )",
)

# Large work orders must not send base64 photos inside the work_orders INSERT request.
# The order is saved first; NewWorkOrderPage already syncs the same photos separately to
# Supabase Storage/customer_photos. This keeps a 12-photo order request small and reliable.
replace_once(
    'src/services/workOrders.service.ts',
    "      created_by: user?.id ?? null,\n      ...createDatabasePayload(input),",
    "      created_by: user?.id ?? null,\n      ...createDatabasePayload({\n        ...input,\n        images: [],\n      }),",
)

print('Release stabilization patch complete.')
