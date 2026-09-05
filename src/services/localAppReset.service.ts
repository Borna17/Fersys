const FERSYS_PREFIXES = [
  'fersys_',
  'fersys-',
]

function isFersysKey(key: string) {
  return FERSYS_PREFIXES.some((prefix) => key.startsWith(prefix))
}

function isSupabaseAuthKey(key: string) {
  return /^sb-.*-auth-token$/.test(key)
}

async function clearBrowserCaches() {
  if (!('caches' in window)) return
  const keys = await caches.keys()
  await Promise.all(keys.map((key) => caches.delete(key)))
}

async function unregisterServiceWorkers() {
  if (!('serviceWorker' in navigator)) return
  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registrations.map((registration) => registration.unregister()))
}

async function deleteIndexedDbDatabases() {
  if (!('indexedDB' in window)) return

  const databases = typeof indexedDB.databases === 'function'
    ? await indexedDB.databases()
    : []

  const names = databases
    .map((database) => database.name)
    .filter((name): name is string => Boolean(name))
    .filter((name) =>
      /fersys|supabase|draft/i.test(name),
    )

  await Promise.all(
    names.map(
      (name) =>
        new Promise<void>((resolve) => {
          const request = indexedDB.deleteDatabase(name)
          request.onsuccess = () => resolve()
          request.onerror = () => resolve()
          request.onblocked = () => resolve()
        }),
    ),
  )
}

export async function resetLocalFersysApp() {
  await Promise.allSettled([
    clearBrowserCaches(),
    unregisterServiceWorkers(),
    deleteIndexedDbDatabases(),
  ])

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index)
    if (!key) continue
    if (isFersysKey(key) || isSupabaseAuthKey(key)) {
      localStorage.removeItem(key)
    }
  }

  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index)
    if (!key) continue
    if (isFersysKey(key) || isSupabaseAuthKey(key)) {
      sessionStorage.removeItem(key)
    }
  }

  window.location.replace('/login?reset=1')
}
