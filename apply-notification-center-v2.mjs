import fs from 'node:fs'

function mustReplace(
  code,
  search,
  replacement,
  label,
) {
  if (!code.includes(search)) {
    throw new Error(
      `Nije pronađen dio: ${label}`,
    )
  }

  return code.replace(
    search,
    replacement,
  )
}

function patchSettings() {
  const path =
    'src/pages/SettingsPage.tsx'

  let code =
    fs.readFileSync(
      path,
      'utf8',
    )

  if (
    !code.includes(
      "NotificationPreferencesPanel",
    )
  ) {
    code =
      mustReplace(
        code,
        "import DocumentLivePreview from '../components/settings/DocumentLivePreview'\n",
        "import DocumentLivePreview from '../components/settings/DocumentLivePreview'\nimport NotificationPreferencesPanel from '../components/settings/NotificationPreferencesPanel'\n",
        'Settings import',
      )
  }

  const start =
    code.indexOf(
      'function NotificationsTab({',
    )

  const end =
    code.indexOf(
      'function OverviewSettingsTab({',
    )

  if (
    start === -1 ||
    end === -1 ||
    end <= start
  ) {
    throw new Error(
      'NotificationsTab nije pronađen.',
    )
  }

  const replacement = `function NotificationsTab({
  settings,
  updateField,
}: {
  settings: CompanySettings
  updateField: UpdateField
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SettingsCard
          icon={
            <Bell className="text-blue-400" />
          }
          title="Glavni prekidač"
          description="Brzo uključi ili isključi obavijesti u aplikaciji."
        >
          <ToggleSetting
            title="Obavijesti u aplikaciji"
            description="Ako je isključeno, zvonce neće prikazivati nove FERSYS obavijesti."
            checked={
              settings.notificationsEnabled
            }
            onChange={(checked) =>
              updateField(
                'notificationsEnabled',
                checked,
              )
            }
          />
        </SettingsCard>

        <SettingsCard
          icon={
            <Bell className="text-violet-400" />
          }
          title="E-mail obavijesti"
          description="Priprema za slanje važnih upozorenja e-mailom."
        >
          <ToggleSetting
            title="E-mail obavijesti"
            description="Ovu postavku zadržavamo za sljedeću fazu push/e-mail dostave."
            checked={
              settings.emailNotificationsEnabled
            }
            onChange={(checked) =>
              updateField(
                'emailNotificationsEnabled',
                checked,
              )
            }
          />
        </SettingsCard>
      </div>

      <NotificationPreferencesPanel />
    </div>
  )
}

`

  code =
    code.slice(
      0,
      start,
    ) +
    replacement +
    code.slice(end)

  fs.writeFileSync(
    path,
    code,
  )
}

function patchTopbar() {
  const path =
    'src/components/Topbar.tsx'

  let code =
    fs.readFileSync(
      path,
      'utf8',
    )

  code =
    code.replace(
      `  const unreadNotificationsCount =
    notifications.filter(
      (notification) =>
        !notification.isRead,
    ).length`,
      `  const unreadNotificationsCount =
    notifications.filter(
      (notification) =>
        !notification.isRead &&
        !notification.isSilent,
    ).length`,
    )

  if (
    !code.includes(
      "'fersys:notifications-refresh'",
    )
  ) {
    const needle = `    window.addEventListener(
      'focus',
      handleWindowFocus,
    )`

    const replacement = `${needle}

    window.addEventListener(
      'fersys:notifications-refresh',
      handleWindowFocus,
    )`

    code =
      mustReplace(
        code,
        needle,
        replacement,
        'Topbar refresh listener',
      )

    const cleanup = `      window.removeEventListener(
        'focus',
        handleWindowFocus,
      )`

    const cleanupReplacement = `${cleanup}
      window.removeEventListener(
        'fersys:notifications-refresh',
        handleWindowFocus,
      )`

    code =
      mustReplace(
        code,
        cleanup,
        cleanupReplacement,
        'Topbar refresh cleanup',
      )
  }

  fs.writeFileSync(
    path,
    code,
  )
}

patchSettings()
patchTopbar()

console.log(
  '✅ Notification Center v2 povezan s Postavkama i Topbarom.',
)
