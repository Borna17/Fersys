import fs from 'node:fs'

function replaceOnce(
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

function patchAdminLayout() {
  const path =
    'src/admin/AdminLayout.tsx'

  let code =
    fs.readFileSync(
      path,
      'utf8',
    )

  if (
    !code.includes(
      'Mail,',
    )
  ) {
    code =
      replaceOnce(
        code,
        '  LogOut,\n',
        '  LogOut,\n  Mail,\n',
        'AdminLayout Mail import',
      )
  }

  if (
    !code.includes(
      "path: '/admin/email'",
    )
  ) {
    code =
      replaceOnce(
        code,
        `  {
    name: 'Podrška',
    path: '/admin/support',
    icon: Headphones,
  },`,
        `  {
    name: 'E-mail centar',
    path: '/admin/email',
    icon: Mail,
  },
  {
    name: 'Podrška',
    path: '/admin/support',
    icon: Headphones,
  },`,
        'AdminLayout Email nav',
      )
  }

  fs.writeFileSync(
    path,
    code,
  )
}

function patchRouter() {
  const path =
    'src/router/AppRouter.tsx'

  let code =
    fs.readFileSync(
      path,
      'utf8',
    )

  if (
    !code.includes(
      'AdminEmailCenterPage',
    )
  ) {
    code =
      replaceOnce(
        code,
        "import { AdminCompanyDetailsPage } from '../admin/AdminCompanyDetailsPage'\n",
        "import { AdminCompanyDetailsPage } from '../admin/AdminCompanyDetailsPage'\nimport { AdminEmailCenterPage } from '../admin/AdminEmailCenterPage'\n",
        'AppRouter Email import',
      )
  }

  if (
    !code.includes(
      'path="/admin/email"',
    )
  ) {
    code =
      replaceOnce(
        code,
        '        <Route path="/admin/support" element={<AdminSupportPage />} />',
        `        <Route path="/admin/email" element={<AdminEmailCenterPage />} />
        <Route path="/admin/support" element={<AdminSupportPage />} />`,
        'AppRouter Email route',
      )
  }

  fs.writeFileSync(
    path,
    code,
  )
}

patchAdminLayout()
patchRouter()

console.log(
  '✅ Email Center dodan u Super Admin meni i routing.',
)
