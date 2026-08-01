import type { ReactNode } from 'react'
import {
  Navigate,
  Route,
  Routes,
} from 'react-router'

import {
  AuthProvider,
  useAuth,
} from '../auth/AuthProvider'
import FersysLoader from '../components/FersysLoader'
import AppLayout from '../layouts/AppLayout'
import { AiAssistantPage } from '../pages/AiAssistantPage'
import { CalendarPage } from '../pages/CalendarPage'
import { CustomerProfilePage } from '../pages/CustomerProfilePage'
import { CustomersPage } from '../pages/CustomersPage'
import { DashboardPage } from '../pages/DashboardPage'
import { EmployeesPage } from '../pages/EmployeesPage'
import { IncomingInvoicesPage } from '../pages/IncomingInvoicesPage'
import InventoryItemDetailsPage from '../pages/InventoryItemDetailsPage'
import InventoryMovementsPage from '../pages/InventoryMovementsPage'
import InventoryPage from '../pages/InventoryPage'
import InventoryQrScannerPage from '../pages/InventoryQrScannerPage'
import { InvoicesPage } from '../pages/InvoicesPage'
import { LoginPage } from '../pages/LoginPage'
import { NewIncomingInvoicePage } from '../pages/NewIncomingInvoicePage'
import NewInventoryItemPage from '../pages/NewInventoryItemPage'
import { NewInvoicePage } from '../pages/NewInvoicePage'
import { NewOfferPage } from '../pages/NewOfferPage'
import { NewWorkOrderPage } from '../pages/NewWorkOrderPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { OffersPage } from '../pages/OffersPage'
import { RegisterPage } from '../pages/RegisterPage'
import { ResetPasswordPage } from '../pages/ResetPasswordPage'
import { SettingsPage } from '../pages/SettingsPage'
import { SupabaseTestPage } from '../pages/SupabaseTestPage'
import { WorkOrderDetailsPage } from '../pages/WorkOrderDetailsPage'
import { WorkOrderSettingsPage } from '../pages/WorkOrderSettingsPage'
import { WorkOrdersPage } from '../pages/WorkOrdersPage'

type RouteGuardProps = {
  children: ReactNode
}

function ProtectedRoute({
  children,
}: RouteGuardProps) {
  const {
    session,
    isLoading,
    companySetupError,
    retryCompanySetup,
  } = useAuth()

  if (isLoading) {
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

  if (companySetupError) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-950 p-5 text-white">
        <div className="w-full max-w-lg rounded-3xl border border-red-500/20 bg-slate-900 p-6 text-center">
          <h1 className="text-xl font-black">
            Tvrtka nije pripremljena
          </h1>

          <p className="mt-3 break-words text-sm leading-6 text-slate-400">
            {companySetupError}
          </p>

          <button
            type="button"
            onClick={() => {
              void retryCompanySetup()
            }}
            className="mt-5 min-h-11 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white"
          >
            Pokušaj ponovno
          </button>
        </div>
      </div>
    )
  }

  return children
}

function PublicOnlyRoute({
  children,
}: RouteGuardProps) {
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

  if (session) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    )
  }

  return children
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
        element={<ResetPasswordPage />}
      />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />

        <Route
          path="/customers"
          element={<CustomersPage />}
        />

        <Route
          path="/customers/:id"
          element={<CustomerProfilePage />}
        />

        <Route
          path="/work-orders"
          element={<WorkOrdersPage />}
        />

        <Route
          path="/work-orders/new"
          element={<NewWorkOrderPage />}
        />

        <Route
          path="/work-orders/:id"
          element={<WorkOrderDetailsPage />}
        />

        <Route
          path="/offers"
          element={<OffersPage />}
        />

        <Route
          path="/offers/new"
          element={<NewOfferPage />}
        />

        <Route
          path="/offers/:offerId/edit"
          element={<NewOfferPage />}
        />

        <Route
          path="/invoices"
          element={<InvoicesPage />}
        />

        <Route
          path="/invoices/new"
          element={<NewInvoicePage />}
        />

        <Route
          path="/invoices/:invoiceId/edit"
          element={<NewInvoicePage />}
        />

        <Route
          path="/incoming-invoices"
          element={<IncomingInvoicesPage />}
        />

        <Route
          path="/incoming-invoices/new"
          element={<NewIncomingInvoicePage />}
        />

        <Route
          path="/incoming-invoices/:incomingInvoiceId/edit"
          element={<NewIncomingInvoicePage />}
        />

        <Route
          path="/calendar"
          element={<CalendarPage />}
        />

        <Route
          path="/inventory"
          element={<InventoryPage />}
        />

        <Route
          path="/inventory/items/new"
          element={<NewInventoryItemPage />}
        />

        <Route
          path="/inventory/items/:id"
          element={<InventoryItemDetailsPage />}
        />

        <Route
          path="/inventory/items/:id/edit"
          element={<NewInventoryItemPage />}
        />

        <Route
          path="/inventory/scan"
          element={<InventoryQrScannerPage />}
        />

        <Route
          path="/inventory/movements"
          element={<InventoryMovementsPage />}
        />

        <Route
          path="/settings"
          element={<SettingsPage />}
        />

        <Route
          path="/settings/employees"
          element={<EmployeesPage />}
        />

        <Route
          path="/settings/work-orders"
          element={<WorkOrderSettingsPage />}
        />

        <Route
          path="/ai"
          element={<AiAssistantPage />}
        />

        <Route
          path="/supabase-test"
          element={<SupabaseTestPage />}
        />
      </Route>

      <Route
        path="*"
        element={<NotFoundPage />}
      />
    </Routes>
  )
}

export function AppRouter() {
  return (
    <AuthProvider>
      <RouterContent />
    </AuthProvider>
  )
}