import fs from 'node:fs'

function replaceOnce(
  source,
  search,
  replacement,
  label,
) {
  if (!source.includes(search)) {
    throw new Error(
      `Nisam pronašao dio za izmjenu: ${label}`,
    )
  }

  return source.replace(
    search,
    replacement,
  )
}

function patchSidebar() {
  const path =
    'src/components/Sidebar.tsx'

  let code =
    fs.readFileSync(
      path,
      'utf8',
    )

  if (
    !code.includes(
      "CarFront,",
    )
  ) {
    code =
      replaceOnce(
        code,
        "  CalendarDays,\n",
        "  CalendarDays,\n  CarFront,\n",
        'Sidebar CarFront import',
      )
  }

  if (
    !code.includes(
      "path: '/vehicles'",
    )
  ) {
    code =
      replaceOnce(
        code,
        "  { name: 'Kalendar', path: '/calendar', icon: CalendarDays, permission: 'calendar.view', feature: 'calendar' },\n",
        "  { name: 'Kalendar', path: '/calendar', icon: CalendarDays, permission: 'calendar.view', feature: 'calendar' },\n  { name: 'Vozila', path: '/vehicles', icon: CarFront, permission: 'dashboard.view' },\n",
        'Sidebar vehicles item',
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
      "VehicleDetailsPage",
    )
  ) {
    code =
      replaceOnce(
        code,
        "import { WorkOrdersPage } from '../pages/WorkOrdersPage'\n",
        "import { WorkOrdersPage } from '../pages/WorkOrdersPage'\nimport { VehiclesPage } from '../pages/VehiclesPage'\nimport { VehicleDetailsPage } from '../pages/VehicleDetailsPage'\n",
        'Router vehicle imports',
      )
  }

  if (
    !code.includes(
      'path="/vehicles"',
    )
  ) {
    const anchor = `        <Route
          path="/calendar"
          element={
            <Guard
              permission="calendar.view"
              feature="calendar"
            >
              <CalendarPage />
            </Guard>
          }
        />
`

    const routes = `${anchor}
        <Route
          path="/vehicles"
          element={
            <Guard permission="dashboard.view">
              <VehiclesPage />
            </Guard>
          }
        />

        <Route
          path="/vehicles/:id"
          element={
            <Guard permission="dashboard.view">
              <VehicleDetailsPage />
            </Guard>
          }
        />
`

    code =
      replaceOnce(
        code,
        anchor,
        routes,
        'Router vehicle routes',
      )
  }

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

  code = code.replace(
    `    label: 'Novo vozilo',
    route: '/vehicles',`,
    `    label: 'Novo vozilo',
    route: '/vehicles?new=1',`,
  )

  fs.writeFileSync(
    path,
    code,
  )
}

patchSidebar()
patchRouter()
patchTopbar()

console.log(
  '✅ FERSYS Vehicles v1 povezan sa Sidebarom, Routerom i + Novo gumbom.',
)
