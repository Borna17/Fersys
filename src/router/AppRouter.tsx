import type {
  ReactNode,
} from 'react'

import {
  Navigate,
  Route,
  Routes,
} from 'react-router'

import {
  AuthProvider,
  useAuth,
} from '../auth/AuthProvider'

import AdminGuard from '../admin/AdminGuard'
import AdminLayout from '../admin/AdminLayout'

import {
  AdminDashboardPage,
} from '../admin/AdminDashboardPage'

import {
  AdminCompaniesPage,
} from '../admin/AdminCompaniesPage'

import {
  AdminCompanyDetailsPage,
} from '../admin/AdminCompanyDetailsPage'

import {
  AdminEmailCenterPage,
} from '../admin/AdminEmailCenterPage'

import {
  AdminSupportPage,
} from '../admin/AdminSupportPage'

import type {
  PermissionKey,
} from '../auth/permissions'

import FersysLoader from '../components/FersysLoader'

import PlanLock from '../components/subscription/PlanLock'

import AppLayout from '../layouts/AppLayout'

import {
  AiAssistantPage,
} from '../pages/AiAssistantPage'

import {
  CalendarPage,
} from '../pages/CalendarPage'

import {
  CustomerProfilePage,
} from '../pages/CustomerProfilePage'

import {
  CustomersPage,
} from '../pages/CustomersPage'

import {
  DashboardPage,
} from '../pages/DashboardPage'

import {
  EmployeesPage,
} from '../pages/EmployeesPage'

import {
  IncomingInvoicesPage,
} from '../pages/IncomingInvoicesPage'

import InventoryItemDetailsPage from '../pages/InventoryItemDetailsPage'

import InventoryMovementsPage from '../pages/InventoryMovementsPage'

import InventoryPage from '../pages/InventoryPage'

import InventoryQrScannerPage from '../pages/InventoryQrScannerPage'

import {
  InvoicesPage,
} from '../pages/InvoicesPage'

import {
  JoinInvitationPage,
} from '../pages/JoinInvitationPage'

import {
  LoginPage,
} from '../pages/LoginPage'

import {
  NewIncomingInvoicePage,
} from '../pages/NewIncomingInvoicePage'

import NewInventoryItemPage from '../pages/NewInventoryItemPage'

import {
  NewInvoicePage,
} from '../pages/NewInvoicePage'

import {
  NewOfferPage,
} from '../pages/NewOfferPage'

import {
  OfferDetailsPage,
} from '../pages/OfferDetailsPage'

import {
  NewWorkOrderPage,
} from '../pages/NewWorkOrderPage'

import {
  EditWorkOrderPage,
} from '../pages/EditWorkOrderPage'

import {
  NotFoundPage,
} from '../pages/NotFoundPage'

import {
  OffersPage,
} from '../pages/OffersPage'

import {
  PricingPage,
} from '../pages/PricingPage'

import {
  ProfilePage,
} from '../pages/ProfilePage'

import {
  RegisterPage,
} from '../pages/RegisterPage'

import {
  ResetPasswordPage,
} from '../pages/ResetPasswordPage'

import {
  SettingsPage,
} from '../pages/SettingsPage'

import {
  SupabaseTestPage,
} from '../pages/SupabaseTestPage'

import {
  WorkOrderDetailsPage,
} from '../pages/WorkOrderDetailsPage'

import {
  WorkOrderSettingsPage,
} from '../pages/WorkOrderSettingsPage'

import {
  WorkOrdersPage,
} from '../pages/WorkOrdersPage'

import {
  VehiclesPage,
} from '../pages/VehiclesPage'

import {
  VehicleDetailsPage,
} from '../pages/VehicleDetailsPage'

import {
  SupportPage,
} from '../pages/SupportPage'

import {
  SubscriptionProvider,
  useSubscription,
} from '../subscription/SubscriptionProvider'

import {
  featureRequiredPlan,
  type SubscriptionFeature,
} from '../subscription/plans'

type RouteWrapperProps = {
  children: ReactNode
}

function ProtectedRoute({
  children,
}: RouteWrapperProps) {
  const {
    session,
    membership,
    isLoading,
    isAccessLoading,
    companySetupError,
    retryCompanySetup,
  } = useAuth()

  const {
    isLoading:
      isSubscriptionLoading,
    error:
      subscriptionError,
  } = useSubscription()

  if (
    isLoading ||
    isAccessLoading ||
    isSubscriptionLoading
  ) {
    return (
      <FersysLoader
        fullScreen
        text="Provjera korisničkog računa..."
      />
    )
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  if (
    companySetupError ||
    subscriptionError
  ) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-950 p-5 text-white">
        <div className="w-full max-w-lg rounded-3xl border border-red-500/20 bg-slate-900 p-6 text-center">
          <h1 className="text-xl font-black">
            Tvrtka nije
            pripremljena
          </h1>

          <p className="mt-3 break-words text-sm leading-6 text-slate-400">
            {companySetupError ||
              subscriptionError}
          </p>

          <button
            type="button"
            onClick={() =>
              void retryCompanySetup()
            }
            className="mt-5 min-h-11 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white"
          >
            Pokušaj ponovno
          </button>
        </div>
      </div>
    )
  }

  if (
    !membership ||
    membership.status !==
      'active'
  ) {
    return (
      <AccessDeniedPage
        title="Račun nema aktivan pristup"
        description="Obrati se vlasniku ili administratoru tvrtke."
      />
    )
  }

  return children
}

function PermissionRoute({
  permission,
  children,
}: {
  permission: PermissionKey
  children: ReactNode
}) {
  const {
    can,
  } = useAuth()

  if (
    !can(permission)
  ) {
    return (
      <AccessDeniedPage
        title="Pristup nije dopušten"
        description="Nemaš dopuštenje za pregled ovog dijela FERSYS-a."
      />
    )
  }

  return children
}

function PlanRoute({
  feature,
  children,
}: {
  feature:
    SubscriptionFeature
  children: ReactNode
}) {
  const {
    hasFeature,
  } = useSubscription()

  if (
    !hasFeature(feature)
  ) {
    return (
      <PlanLock
        feature={
          feature
        }
        requiredPlan={
          featureRequiredPlan[
            feature
          ]
        }
      />
    )
  }

  return children
}

function BusinessPlanRoute({
  children,
}: RouteWrapperProps) {
  const {
    subscription,
    isTrialing,
  } = useSubscription()

  if (isTrialing) {
    return children
  }

  if (
    subscription?.planId !==
      'business' &&
    subscription?.planId !==
      'pro'
  ) {
    return (
      <PlanLock
        feature="inventory"
        requiredPlan="business"
      />
    )
  }

  return children
}

function AccessDeniedPage({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <main className="grid min-h-[65vh] place-items-center px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-amber-500/20 bg-slate-900 p-7 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/10 text-2xl">
          🔒
        </div>

        <h1 className="mt-5 text-2xl font-black">
          {title}
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          {description}
        </p>

        <a
          href="/dashboard"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white"
        >
          Povratak na
          Dashboard
        </a>
      </div>
    </main>
  )
}

function PublicOnlyRoute({
  children,
}: RouteWrapperProps) {
  const {
    session,
    isLoading,
  } = useAuth()

  if (isLoading) {
    return (
      <FersysLoader
        fullScreen
        text="Učitavanje FERSYS-a..."
      />
    )
  }

  return session ? (
    <Navigate
      to="/dashboard"
      replace
    />
  ) : (
    children
  )
}

function Guard({
  permission,
  feature,
  children,
}: {
  permission:
    PermissionKey
  feature?:
    SubscriptionFeature
  children: ReactNode
}) {
  const content =
    feature ? (
      <PlanRoute
        feature={
          feature
        }
      >
        {children}
      </PlanRoute>
    ) : (
      children
    )

  return (
    <PermissionRoute
      permission={
        permission
      }
    >
      {content}
    </PermissionRoute>
  )
}

function RouterContent() {
  const {
    session,
    isLoading,
  } = useAuth()

  return (
    <Routes>
      <Route
        path="/"
        element={
          isLoading ? (
            <FersysLoader
              fullScreen
              text="Pokretanje FERSYS-a..."
            />
          ) : (
            <Navigate
              to={
                session
                  ? '/dashboard'
                  : '/login'
              }
              replace
            />
          )
        }
      />

      <Route
        path="/join"
        element={
          <JoinInvitationPage />
        }
      />

      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />

      <Route
        path="/reset-password"
        element={
          <ResetPasswordPage />
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <AdminGuard>
              <AdminLayout />
            </AdminGuard>
          </ProtectedRoute>
        }
      >
        <Route
          path="/admin"
          element={
            <AdminDashboardPage />
          }
        />

        <Route
          path="/admin/companies"
          element={
            <AdminCompaniesPage />
          }
        />

        <Route
          path="/admin/companies/:companyId"
          element={
            <AdminCompanyDetailsPage />
          }
        />

        <Route
          path="/admin/email"
          element={
            <AdminEmailCenterPage />
          }
        />

        <Route
          path="/admin/support"
          element={
            <AdminSupportPage />
          }
        />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={
            <Guard
              permission="dashboard.view"
            >
              <DashboardPage />
            </Guard>
          }
        />

        <Route
          path="/support"
          element={
            <Guard
              permission="dashboard.view"
            >
              <SupportPage />
            </Guard>
          }
        />

        <Route
          path="/pricing"
          element={
            <PricingPage />
          }
        />

        <Route
          path="/offers"
          element={
            <Guard
              permission="offers.view"
              feature="offers"
            >
              <OffersPage />
            </Guard>
          }
        />

        <Route
          path="/offers/:offerId"
          element={
            <Guard
              permission="offers.view"
              feature="offers"
            >
              <OfferDetailsPage />
            </Guard>
          }
        />

        <Route
          path="/offers/new"
          element={
            <Guard
              permission="offers.manage"
              feature="offers"
            >
              <NewOfferPage />
            </Guard>
          }
        />

        <Route
          path="/offers/:offerId/edit"
          element={
            <Guard
              permission="offers.manage"
              feature="offers"
            >
              <NewOfferPage />
            </Guard>
          }
        />

        <Route
          path="/settings/employees"
          element={
            <Guard
              permission="employees.view"
              feature="employees"
            >
              <EmployeesPage />
            </Guard>
          }
        />

        <Route
          path="/ai"
          element={
            <Guard
              permission="ai.use"
              feature="ai"
            >
              <AiAssistantPage />
            </Guard>
          }
        />

        <Route
          path="/invoices"
          element={
            <Guard
              permission="invoices.view"
              feature="invoices"
            >
              <InvoicesPage />
            </Guard>
          }
        />

        <Route
          path="/invoices/new"
          element={
            <Guard
              permission="invoices.view"
              feature="invoices"
            >
              <NewInvoicePage />
            </Guard>
          }
        />

        <Route
          path="/invoices/:invoiceId/edit"
          element={
            <Guard
              permission="invoices.view"
              feature="invoices"
            >
              <NewInvoicePage />
            </Guard>
          }
        />

        <Route
          path="/incoming-invoices"
          element={
            <Guard
              permission="incomingInvoices.view"
              feature="incoming_invoices"
            >
              <IncomingInvoicesPage />
            </Guard>
          }
        />

        <Route
          path="/incoming-invoices/new"
          element={
            <Guard
              permission="incomingInvoices.view"
              feature="incoming_invoices"
            >
              <NewIncomingInvoicePage />
            </Guard>
          }
        />

        <Route
          path="/incoming-invoices/:incomingInvoiceId/edit"
          element={
            <Guard
              permission="incomingInvoices.view"
              feature="incoming_invoices"
            >
              <NewIncomingInvoicePage />
            </Guard>
          }
        />

        <Route
          path="/inventory"
          element={
            <Guard
              permission="inventory.view"
              feature="inventory"
            >
              <InventoryPage />
            </Guard>
          }
        />

        <Route
          path="/inventory/items/new"
          element={
            <Guard
              permission="inventory.manage"
              feature="inventory"
            >
              <NewInventoryItemPage />
            </Guard>
          }
        />

        <Route
          path="/inventory/items/:id"
          element={
            <Guard
              permission="inventory.view"
              feature="inventory"
            >
              <InventoryItemDetailsPage />
            </Guard>
          }
        />

        <Route
          path="/inventory/items/:id/edit"
          element={
            <Guard
              permission="inventory.manage"
              feature="inventory"
            >
              <NewInventoryItemPage />
            </Guard>
          }
        />

        <Route
          path="/inventory/scan"
          element={
            <Guard
              permission="inventory.view"
              feature="inventory"
            >
              <InventoryQrScannerPage />
            </Guard>
          }
        />

        <Route
          path="/inventory/movements"
          element={
            <Guard
              permission="inventory.view"
              feature="inventory"
            >
              <InventoryMovementsPage />
            </Guard>
          }
        />

        <Route
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

        <Route
          path="/vehicles"
          element={
            <PermissionRoute
              permission="vehicles.view"
            >
              <BusinessPlanRoute>
                <VehiclesPage />
              </BusinessPlanRoute>
            </PermissionRoute>
          }
        />

        <Route
          path="/vehicles/:id"
          element={
            <PermissionRoute
              permission="vehicles.view"
            >
              <BusinessPlanRoute>
                <VehicleDetailsPage />
              </BusinessPlanRoute>
            </PermissionRoute>
          }
        />

        <Route
          path="/customers"
          element={
            <Guard
              permission="customers.view"
              feature="customers"
            >
              <CustomersPage />
            </Guard>
          }
        />

        <Route
          path="/customers/:id"
          element={
            <Guard
              permission="customers.view"
              feature="customers"
            >
              <CustomerProfilePage />
            </Guard>
          }
        />

        <Route
          path="/work-orders"
          element={
            <Guard
              permission="workOrders.view"
              feature="work_orders"
            >
              <WorkOrdersPage />
            </Guard>
          }
        />

        <Route
          path="/work-orders/new"
          element={
            <Guard
              permission="workOrders.manage"
              feature="work_orders"
            >
              <NewWorkOrderPage />
            </Guard>
          }
        />

        <Route
          path="/work-orders/:id/edit"
          element={
            <Guard
              permission="workOrders.manage"
              feature="work_orders"
            >
              <EditWorkOrderPage />
            </Guard>
          }
        />

        <Route
          path="/work-orders/:id"
          element={
            <Guard
              permission="workOrders.view"
              feature="work_orders"
            >
              <WorkOrderDetailsPage />
            </Guard>
          }
        />

        <Route
          path="/settings/work-orders"
          element={
            <Guard
              permission="settings.manage"
            >
              <WorkOrderSettingsPage />
            </Guard>
          }
        />

        <Route
          path="/profile"
          element={
            <ProfilePage />
          }
        />

        <Route
          path="/settings"
          element={
            <Guard
              permission="settings.manage"
            >
              <SettingsPage />
            </Guard>
          }
        />

        <Route
          path="/supabase-test"
          element={
            <Guard
              permission="settings.manage"
            >
              <SupabaseTestPage />
            </Guard>
          }
        />
      </Route>

      <Route
        path="*"
        element={
          <NotFoundPage />
        }
      />
    </Routes>
  )
}

export function AppRouter() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <RouterContent />
      </SubscriptionProvider>
    </AuthProvider>
  )
}