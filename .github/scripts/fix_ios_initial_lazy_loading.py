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
    router = router.replace("const AppLayout = lazy(() => import('../layouts/AppLayout'))\n\n", '', 1)
    router = router.replace("const DashboardPage = lazy(\n  () => import('../pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),\n)\n", '', 1)
    router_path.write_text(router, encoding='utf-8')

# Fix startup deadlocks in subscription loading.
subscription_path = Path('src/subscription/SubscriptionProvider.tsx')
subscription = subscription_path.read_text(encoding='utf-8')

old_branch = """      if (!companyId) {\n        setSubscription(null)\n        return\n      }\n"""
new_branch = """      if (!companyId) {\n        setSubscription(null)\n        initializedCompanyRef.current = null\n        setIsLoading(false)\n        return\n      }\n"""
if old_branch in subscription:
    subscription = subscription.replace(old_branch, new_branch, 1)
elif new_branch not in subscription:
    raise SystemExit('subscription no-company branch not found')

helper_anchor = """const allowedWithoutUsableSubscription = [\n  '/pricing',\n  '/account',\n  '/support',\n]\n\n"""
helper = """const allowedWithoutUsableSubscription = [\n  '/pricing',\n  '/account',\n  '/support',\n]\n\nconst SUBSCRIPTION_REQUEST_TIMEOUT_MS = 10_000\n\nasync function withSubscriptionTimeout<T>(promise: Promise<T>): Promise<T> {\n  let timer = 0\n  const timeout = new Promise<never>((_, reject) => {\n    timer = window.setTimeout(() => {\n      reject(new Error('Provjera pretplate traje predugo. Provjeri internet vezu i pokušaj ponovno.'))\n    }, SUBSCRIPTION_REQUEST_TIMEOUT_MS)\n  })\n\n  try {\n    return await Promise.race([promise, timeout])\n  } finally {\n    window.clearTimeout(timer)\n  }\n}\n\n"""
if 'withSubscriptionTimeout' not in subscription:
    if helper_anchor not in subscription:
        raise SystemExit('subscription timeout helper anchor not found')
    subscription = subscription.replace(helper_anchor, helper, 1)

old_call = """        const context =\n          await getSubscriptionContext()\n"""
new_call = """        const context =\n          await withSubscriptionTimeout(\n            getSubscriptionContext(),\n          )\n"""
if old_call in subscription:
    subscription = subscription.replace(old_call, new_call, 1)
elif new_call not in subscription:
    raise SystemExit('subscription context call not found')

subscription_path.write_text(subscription, encoding='utf-8')
print('iOS startup/account-loading deadlocks fixed and subscription request bounded')
