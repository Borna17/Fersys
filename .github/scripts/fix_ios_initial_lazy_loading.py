from pathlib import Path

# Keep the initial iOS route modules eager-loaded.
router_path = Path('src/router/AppRouter.tsx')
router = router_path.read_text(encoding='utf-8')

if "import AppLayout from '../layouts/AppLayout'" not in router:
    anchor = "import AdminGuard from '../admin/AdminGuard'\n\nimport FersysLoader"
    replacement = "import AdminGuard from '../admin/AdminGuard'\nimport AppLayout from '../layouts/AppLayout'\nimport { DashboardPage } from '../pages/DashboardPage'\n\nimport FersysLoader"
    if anchor not in router:
        raise SystemExit('router import anchor not found')
    router = router.replace(anchor, replacement, 1)

    old_app_layout = "const AppLayout = lazy(() => import('../layouts/AppLayout'))\n\n"
    router = router.replace(old_app_layout, '', 1)

    old_dashboard = "const DashboardPage = lazy(\n  () => import('../pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),\n)\n"
    router = router.replace(old_dashboard, '', 1)

    router_path.write_text(router, encoding='utf-8')

# Fix the real startup deadlock in subscription loading.
subscription_path = Path('src/subscription/SubscriptionProvider.tsx')
subscription = subscription_path.read_text(encoding='utf-8')

old_branch = """      if (!companyId) {\n        setSubscription(null)\n        return\n      }\n"""
new_branch = """      if (!companyId) {\n        setSubscription(null)\n        initializedCompanyRef.current = null\n        setIsLoading(false)\n        return\n      }\n"""

if old_branch in subscription:
    subscription = subscription.replace(old_branch, new_branch, 1)
elif new_branch not in subscription:
    raise SystemExit('subscription no-company branch not found')

subscription_path.write_text(subscription, encoding='utf-8')
print('iOS startup and account-loading fixes applied')
