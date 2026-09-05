from pathlib import Path


def replace_once(path: Path, old: str, new: str):
    text = path.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Expected block not found in {path}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


settings = Path('src/pages/SettingsPage.tsx')
replace_once(
    settings,
    "import WeatherMorningSettingsCard from '../components/settings/WeatherMorningSettingsCard'\n",
    "import WeatherMorningSettingsCard from '../components/settings/WeatherMorningSettingsCard'\nimport LocalAppResetCard from '../components/settings/LocalAppResetCard'\n",
)
replace_once(
    settings,
    """        <SettingsCard
          icon={<ShieldCheck className=\"text-emerald-400\" />}
          title=\"Napredna zaštita\"
""",
    """        <LocalAppResetCard />

        <SettingsCard
          icon={<ShieldCheck className=\"text-emerald-400\" />}
          title=\"Napredna zaštita\"
""",
)

auth = Path('src/auth/AuthProvider.tsx')
text = auth.read_text(encoding='utf-8')

marker = "const AuthContext =\n  createContext<AuthContextValue | null>(null)\n"
helper = """const AuthContext =
  createContext<AuthContextValue | null>(null)

const AUTH_REQUEST_TIMEOUT_MS = 10_000

async function withTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs = AUTH_REQUEST_TIMEOUT_MS,
): Promise<T> {
  let timer = 0
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => {
      reject(new Error(`${label} traje predugo. Provjeri internet vezu i pokušaj ponovno.`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    window.clearTimeout(timer)
  }
}
"""
if marker not in text:
    raise SystemExit('AuthContext marker not found')
text = text.replace(marker, helper, 1)

text = text.replace(
    """        const nextMembership =
          await getCurrentMembership()
""",
    """        const nextMembership =
          await withTimeout(
            getCurrentMembership(),
            'Provjera pristupa korisnika',
          )
""",
    1,
)

text = text.replace(
    """          await supabase.auth.getSession()
""",
    """          await withTimeout(
            supabase.auth.getSession(),
            'Učitavanje korisničke sesije',
          )
""",
    1,
)

old_prepare = """        await ensureCompanyForCurrentUser()

        void supabase.functions
          .invoke('company-registration-notify')
          .catch(() => undefined)

        const nextMembership =
          await getCurrentMembership()

        if (!isCancelled) {
          preparedUserIdRef.current = userId
          accessInitializedRef.current = true
          if (nextMembership?.companyId) {
            sessionStorage.setItem('fersys_active_company_id', nextMembership.companyId)
          } else {
            sessionStorage.removeItem('fersys_active_company_id')
          }
          setMembership(nextMembership)
        }
"""
new_prepare = """        // Postojeći korisnik prvo dobiva pristup iz jedne kratke RPC provjere.
        // Teži bootstrap tvrtke više ne blokira svaki ulazak u aplikaciju.
        let nextMembership = await withTimeout(
          getCurrentMembership(),
          'Provjera pristupa korisnika',
        )

        if (!nextMembership) {
          await withTimeout(
            ensureCompanyForCurrentUser(),
            'Priprema tvrtke',
            12_000,
          )
          nextMembership = await withTimeout(
            getCurrentMembership(),
            'Provjera pristupa nakon pripreme tvrtke',
          )
        } else {
          // Jednokratne postavke tvrtke dovrši u pozadini. Ako servis trenutačno
          // nije dostupan, korisniku s valjanim članstvom ne blokiramo aplikaciju.
          void ensureCompanyForCurrentUser().catch((error) => {
            console.warn('Pozadinska priprema tvrtke nije uspjela:', error)
          })
        }

        void supabase.functions
          .invoke('company-registration-notify')
          .catch(() => undefined)

        if (!isCancelled) {
          preparedUserIdRef.current = userId
          accessInitializedRef.current = true
          if (nextMembership?.companyId) {
            sessionStorage.setItem('fersys_active_company_id', nextMembership.companyId)
          } else {
            sessionStorage.removeItem('fersys_active_company_id')
          }
          setMembership(nextMembership)
        }
"""
if old_prepare not in text:
    raise SystemExit('prepareCompany block not found')
text = text.replace(old_prepare, new_prepare, 1)

old_focus = """    function refreshOnFocus() {
      if (
        document.visibilityState === 'visible'
      ) {
        void refreshAccess()
      }
    }
"""
new_focus = """    let lastFocusRefreshAt = 0

    function refreshOnFocus() {
      if (document.visibilityState !== 'visible') return

      const now = Date.now()
      if (now - lastFocusRefreshAt < 30_000) return
      lastFocusRefreshAt = now
      void refreshAccess()
    }
"""
if old_focus not in text:
    raise SystemExit('focus refresh block not found')
text = text.replace(old_focus, new_focus, 1)

auth.write_text(text, encoding='utf-8')

main = Path('src/main.tsx')
text = main.read_text(encoding='utf-8')
text = text.replace(
    """      void registration.update()
      window.setTimeout(() => void registration.update(), 1_500)
      window.setInterval(() => void registration.update(), 5 * 60 * 1000)
""",
    """      void registration.update()
      // Nema potrebe provjeravati novu verziju svake 1.5 s / 5 min.
      // Rjeđa provjera smanjuje mrežne pozive i nepotrebne SW cikluse.
      window.setInterval(() => void registration.update(), 30 * 60 * 1000)
""",
    1,
)

old_check = """  const checkForUpdate = () => {
    if (document.visibilityState !== 'visible' || !navigator.onLine) return
    if (activeRegistration) {
      void activeRegistration.update()
      return
    }
    void navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        activeRegistration = registration
        return registration.update()
      }
      return undefined
    })
  }
"""
new_check = """  let lastUpdateCheckAt = 0

  const checkForUpdate = () => {
    if (document.visibilityState !== 'visible' || !navigator.onLine) return

    const now = Date.now()
    if (now - lastUpdateCheckAt < 60_000) return
    lastUpdateCheckAt = now

    if (activeRegistration) {
      void activeRegistration.update()
      return
    }
    void navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        activeRegistration = registration
        return registration.update()
      }
      return undefined
    })
  }
"""
if old_check not in text:
    raise SystemExit('service worker update block not found')
text = text.replace(old_check, new_check, 1)
main.write_text(text, encoding='utf-8')

print('FERSYS local reset + startup/auth/PWA optimization applied.')
