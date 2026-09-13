from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Expected snippet not found in {path}: {old[:120]!r}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')
    print(f'Updated {path}')


# 1) Customer creation should refresh dashboard counters immediately in the same app session.
replace_once(
    'src/pages/CustomersPage.tsx',
    """      setCustomers((current) => [\n        newCustomer,\n        ...current,\n      ])\n\n      setIsModalOpen(false)""",
    """      setCustomers((current) => [\n        newCustomer,\n        ...current,\n      ])\n\n      window.dispatchEvent(\n        new CustomEvent('fersys:dashboard-refresh', {\n          detail: { source: 'customers' },\n        }),\n      )\n\n      setIsModalOpen(false)""",
)

replace_once(
    'src/pages/DashboardPage.tsx',
    """  }, [\n    companyId,\n    refreshKey,\n  ])\n\n  const canViewFinance =""",
    """  }, [\n    companyId,\n    refreshKey,\n  ])\n\n  useEffect(() => {\n    const refreshDashboard = () => {\n      setRefreshKey((current) => current + 1)\n    }\n\n    window.addEventListener(\n      'fersys:dashboard-refresh',\n      refreshDashboard,\n    )\n\n    return () => {\n      window.removeEventListener(\n        'fersys:dashboard-refresh',\n        refreshDashboard,\n      )\n    }\n  }, [])\n\n  const canViewFinance =""",
)


# 2) Keep the Business Flow action reachable above mobile navigation instead of mid-screen.
replace_once(
    'src/components/FloatingUiLayoutFix.tsx',
    """        /*\n         * Poslovni tok je sada mali izvučeni tab uz desni rub.\n         * Ne prekriva sadržaj niti donju navigaciju, ali ostaje\n         * uvijek dostupan jednim dodirom.\n         */\n        button[aria-label=\"Otvori poslovni tok\"] {\n          top: 58% !important;\n          right: -0.45rem !important;\n          bottom: auto !important;\n          left: auto !important;\n          width: 3.25rem !important;\n          min-width: 3.25rem !important;\n          height: 3.25rem !important;\n          min-height: 3.25rem !important;\n          padding: 0 !important;\n          gap: 0 !important;\n          justify-content: center !important;\n          border-top-right-radius: 0 !important;\n          border-bottom-right-radius: 0 !important;\n          border-top-left-radius: 1rem !important;\n          border-bottom-left-radius: 1rem !important;\n          transform: translateY(-50%) !important;\n          z-index: 58 !important;\n        }\n""",
    """        /*\n         * Poslovni tok ostaje kao kompaktan floating action iznad\n         * mobilne navigacije. Više ne sjedi na sredini sadržaja.\n         */\n        button[aria-label=\"Otvori poslovni tok\"] {\n          top: auto !important;\n          right: 0.85rem !important;\n          bottom: calc(5.75rem + var(--fersys-safe-bottom)) !important;\n          left: auto !important;\n          width: 3.25rem !important;\n          min-width: 3.25rem !important;\n          height: 3.25rem !important;\n          min-height: 3.25rem !important;\n          padding: 0 !important;\n          gap: 0 !important;\n          justify-content: center !important;\n          border-radius: 1rem !important;\n          transform: none !important;\n          z-index: 58 !important;\n        }\n""",
)


# 3) Offer PDF: item images already fit inside the normal row, so don't overestimate
# their height and force a mostly empty second A4 page for only a few items.
replace_once(
    'src/utils/offerPdf.ts',
    """  const imageUnits =\n    settings.showItemImages &&\n    item.imageDataUrl\n      ? 1.75\n      : 0""",
    """  const imageUnits =\n    settings.showItemImages &&\n    item.imageDataUrl\n      ? 0.35\n      : 0""",
)

replace_once(
    'src/utils/offerPdf.ts',
    """  const finalUnitsCapacity =\n    hasImages\n      ? 7.2\n      : settings.density ===\n          'compact'\n        ? 9.0\n        : 8.2""",
    """  const closingPenalty =\n    (settings.quickPayBarcodeDataUrl\n      ? 0.65\n      : 0) +\n    (settings.showSignature ||\n    settings.showStamp\n      ? 0.35\n      : 0)\n\n  const finalUnitsCapacity =\n    (hasImages\n      ? 9.0\n      : settings.density ===\n          'compact'\n        ? 9.4\n        : 8.8) -\n    closingPenalty""",
)


# 4) Support admin: surface screenshot availability in the list and keep delete action
# visible in the ticket header instead of only at the bottom of a long panel.
replace_once(
    'src/admin/AdminSupportPage.tsx',
    """                  <p\n                    className={`mt-2 line-clamp-2 text-sm ${\n                      isNew\n                        ? 'text-slate-300'\n                        : 'text-slate-400'\n                    }`}\n                  >\n                    {ticket.message}\n                  </p>\n\n                  <div className=\"mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500\">""",
    """                  <p\n                    className={`mt-2 line-clamp-2 text-sm ${\n                      isNew\n                        ? 'text-slate-300'\n                        : 'text-slate-400'\n                    }`}\n                  >\n                    {ticket.message}\n                  </p>\n\n                  {ticket.attachmentUrl && (\n                    <span className=\"mt-3 inline-flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[11px] font-black text-blue-300\">\n                      📎 Screenshot priložen\n                    </span>\n                  )}\n\n                  <div className=\"mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500\">""",
)

replace_once(
    'src/admin/AdminSupportPage.tsx',
    """        <button\n          type=\"button\"\n          onClick={onClose}\n          className=\"grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-slate-400\"\n        >\n          <X size={18} />\n        </button>""",
    """        <div className=\"flex shrink-0 items-center gap-2\">\n          <button\n            type=\"button\"\n            disabled={deleting}\n            onClick={() =>\n              void deleteTicket()\n            }\n            className=\"grid h-10 w-10 place-items-center rounded-xl border border-red-500/25 bg-red-500/10 text-red-300 transition hover:bg-red-500/20 disabled:opacity-50\"\n            aria-label=\"Obriši ticket\"\n            title=\"Obriši ticket\"\n          >\n            <Trash2 size={17} />\n          </button>\n\n          <button\n            type=\"button\"\n            onClick={onClose}\n            className=\"grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-slate-400\"\n            aria-label=\"Zatvori ticket\"\n          >\n            <X size={18} />\n          </button>\n        </div>""",
)

print('FERSYS professional polish patch applied successfully.')
