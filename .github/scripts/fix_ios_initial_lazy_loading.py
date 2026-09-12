from pathlib import Path

path = Path('src/router/AppRouter.tsx')
text = path.read_text(encoding='utf-8')

# Eager-load the two modules required immediately after authentication on native iOS.
# This prevents the initial Suspense fallback from hanging on "Učitavanje FERSYS modula...".
anchor = "import AdminGuard from '../admin/AdminGuard'\n\nimport FersysLoader"
replacement = "import AdminGuard from '../admin/AdminGuard'\nimport AppLayout from '../layouts/AppLayout'\nimport { DashboardPage } from '../pages/DashboardPage'\n\nimport FersysLoader"
if anchor not in text:
    raise SystemExit('import anchor not found')
text = text.replace(anchor, replacement, 1)

old_app_layout = "const AppLayout = lazy(() => import('../layouts/AppLayout'))\n\n"
if old_app_layout not in text:
    raise SystemExit('AppLayout lazy declaration not found')
text = text.replace(old_app_layout, '', 1)

old_dashboard = "const DashboardPage = lazy(\n  () => import('../pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),\n)\n"
if old_dashboard not in text:
    raise SystemExit('DashboardPage lazy declaration not found')
text = text.replace(old_dashboard, '', 1)

path.write_text(text, encoding='utf-8')
print('iOS initial lazy-loading fix applied')
