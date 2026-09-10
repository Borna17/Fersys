from pathlib import Path

path = Path('src/router/AppRouter.tsx')
text = path.read_text()

import_anchor = "const AdminDashboardPage = lazy(\n  () => import('../admin/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })),\n)\n"
activity_import = "const AdminActivityPage = lazy(\n  () => import('../admin/AdminActivityPage').then((module) => ({ default: module.AdminActivityPage })),\n)\n"

if "const AdminActivityPage = lazy(" not in text:
    if import_anchor not in text:
        raise SystemExit('AdminDashboardPage import anchor not found')
    text = text.replace(import_anchor, import_anchor + activity_import, 1)

route_anchor = '          <Route path="/admin" element={<AdminDashboardPage />} />\n'
activity_route = '          <Route path="/admin/activity" element={<AdminActivityPage />} />\n'

if 'path="/admin/activity"' not in text:
    if route_anchor not in text:
        raise SystemExit('Admin route anchor not found')
    text = text.replace(route_anchor, route_anchor + activity_route, 1)

path.write_text(text)
