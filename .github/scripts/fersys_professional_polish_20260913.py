from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Expected snippet not found in {path}: {old[:120]!r}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')
    print(f'Updated {path}')


# Customer service already emits fersys:customers-changed and now clears the
# persisted dashboard snapshot. Remove the temporary second event path so one
# investor save causes exactly one dashboard refresh/request.
replace_once(
    'src/pages/CustomersPage.tsx',
    """      setCustomers((current) => [\n        newCustomer,\n        ...current,\n      ])\n\n      window.dispatchEvent(\n        new CustomEvent('fersys:dashboard-refresh', {\n          detail: { source: 'customers' },\n        }),\n      )\n\n      setIsModalOpen(false)""",
    """      setCustomers((current) => [\n        newCustomer,\n        ...current,\n      ])\n\n      setIsModalOpen(false)""",
)

replace_once(
    'src/pages/DashboardPage.tsx',
    """  useEffect(() => {\n    const refreshDashboard = () => {\n      setRefreshKey((current) => current + 1)\n    }\n\n    window.addEventListener(\n      'fersys:dashboard-refresh',\n      refreshDashboard,\n    )\n\n    return () => {\n      window.removeEventListener(\n        'fersys:dashboard-refresh',\n        refreshDashboard,\n      )\n    }\n  }, [])\n\n""",
    """""",
)

print('Removed duplicate dashboard refresh path successfully.')
