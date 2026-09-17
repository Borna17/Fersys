import fs from 'node:fs'

const path = 'src/subscription/SubscriptionProvider.tsx'
let source = fs.readFileSync(path, 'utf8')

const replaceOnce = (from, to, label) => {
  if (!source.includes(from)) {
    throw new Error(`Missing patch anchor: ${label}`)
  }
  source = source.replace(from, to)
}

replaceOnce(
  "import { useAuth } from '../auth/AuthProvider'\n",
  "import { useAuth } from '../auth/AuthProvider'\nimport { readOfflineSubscription, rememberOfflineSubscription } from './offlineSubscription'\n",
  'offline subscription import',
)

replaceOnce(
  "    isAccessLoading,\n  } = useAuth()",
  "    isAccessLoading,\n    isOfflineAccess,\n  } = useAuth()",
  'offline auth state',
)

replaceOnce(
  `      const shouldBlock =\n        initializedCompanyRef.current !== companyId\n\n      try {\n`,
  `      const shouldBlock =\n        initializedCompanyRef.current !== companyId\n\n      const cached = readOfflineSubscription(session.user.id, companyId)\n      if (!navigator.onLine || isOfflineAccess) {\n        if (cached) {\n          setSubscription(cached)\n          initializedCompanyRef.current = companyId\n          setError('')\n        } else {\n          setSubscription(null)\n          setError('Pretplata još nije dostupna offline. Spoji uređaj na internet barem jednom.')\n        }\n        setIsLoading(false)\n        return\n      }\n\n      try {\n`,
  'offline startup branch',
)

replaceOnce(
  `        setSubscription(context)\n        initializedCompanyRef.current = companyId\n`,
  `        setSubscription(context)\n        rememberOfflineSubscription(session.user.id, companyId, context)\n        initializedCompanyRef.current = companyId\n`,
  'remember verified subscription',
)

replaceOnce(
  `      membership?.companyId,\n      session?.user.id,\n    ])\n`,
  `      membership?.companyId,\n      session?.user.id,\n      isOfflineAccess,\n    ])\n`,
  'callback dependencies',
)

fs.writeFileSync(path, source)
