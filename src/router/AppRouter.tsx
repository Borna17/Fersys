import {
  Suspense,
  lazy,
  type ReactNode,
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
import type {
  PermissionKey,
} from '../auth/permissions'

import AdminGuard from '../admin/AdminGuard'
import AdminLayout from '../admin/AdminLayout'

import FersysLoader from '../components/FersysLoader'
import WorkOrderPhotoGallerySync from '../components/WorkOrderPhotoGallerySync'
import ReferralClaimBridge from '../components/referral/ReferralClaimBridge'
import PlanLock from '../components/subscription/PlanLock'
import DeliveryNoteContextShortcut from '../components/deliveryNotes/DeliveryNoteContextShortcut'
import AppLayout from '../layouts/AppLayout'
import { OffersPage } from '../pages/OffersPage'
import { WorkOrdersPage } from '../pages/WorkOrdersPage'

import {
  SubscriptionProvider,
  useSubscription,
} from '../subscription/SubscriptionProvider'
import {
  featureRequiredPlan,
  type SubscriptionFeature,
} from '../subscription/plans'

const AdminDashboardPage = lazy(
  () => import('../admin/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })),
)
const AdminCompaniesPage = lazy(
  () => import('../admin/AdminCompaniesPage').then((module) => ({ default: module.AdminCompaniesPage })),
)
const AdminCompanyDetailsPage = lazy(
  () => import('../admin/AdminCompanyDetailsPage').then((module) => ({ default: module.AdminCompanyDetailsPage })),
)
const AdminEmailCenterPage = lazy(
  () => import('../admin/AdminEmailCenterPage').then((module) => ({ default: module.AdminEmailCenterPage })),
)
const AdminSupportPage = lazy(
  () => import('../admin/AdminSupportPage').then((module) => ({ default: module.AdminSupportPage })),
)
const AdminRewardsPage = lazy(
  () => import('../admin/AdminRewardsPage').then((module) => ({ default: module.AdminRewardsPage })),
)
const AiAssistantPage = lazy(
  () => import('../pages/AiAssistantPage').then((module) => ({ default: module.AiAssistantPage })),
)
const CalendarPage = lazy(
  () => import('../pages/CalendarPage').then((module) => ({ default: module.CalendarPage })),
)
const CustomerProfilePage = lazy(
  () => import('../pages/CustomerProfilePage').then((module) => ({ default: module.CustomerProfilePage })),
)
const CustomersPage = lazy(
  () => import('../pages/CustomersPage').then((module) => ({ default: module.CustomersPage })),
)
const DashboardPage = lazy(
  () => import('../pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),
)
const AccountPage = lazy(
  () => import('../pages/AccountPage').then((module) => ({ default: module.AccountPage })),
)
const EditWorkOrderPage = lazy(
  () => import('../pages/EditWorkOrderPage').then((module) => ({ default: module.EditWorkOrderPage })),
)
const EmployeesPage = lazy(
  () => import('../pages/EmployeesPage').then((module) => ({ default: module.EmployeesPage })),
)
const IncomingInvoicesPage = lazy(
  () => import('../pages/IncomingInvoicesPage').then((module) => ({ default: module.IncomingInvoicesPage })),
)
const InventoryItemDetailsPage = lazy(() => import('../pages/InventoryItemDetailsPage'))
const InventoryMovementsPage = lazy(
  () => import('../pages/InventoryMovementsPage').then((module) => ({ default: module.InventoryMovementsPage })),
)
const InventoryPage = lazy(
  () => import('../pages/InventoryPage').then((module) => ({ default: module.InventoryPage })),
)
const InventoryQrScannerPage = lazy(() => import('../pages/InventoryQrScannerPage'))
const DeliveryNotesPage = lazy(
  () => import('../pages/DeliveryNotesPage').then((module) => ({ default: module.DeliveryNotesPage })),
)
const NewDeliveryNotePage = lazy(
  () => import('../pages/NewDeliveryNotePage').then((module) => ({ default: module.NewDeliveryNotePage })),
)
const DeliveryNoteDetailsPage = lazy(
  () => import('../pages/DeliveryNoteDetailsPage').then((module) => ({ default: module.DeliveryNoteDetailsPage })),
)
const DeliveryNoteSettingsPage = lazy(
  () => import('../pages/DeliveryNoteSettingsPage').then((module) => ({ default: module.DeliveryNoteSettingsPage })),
)
const InvoicesPage = lazy(
  () => import('../pages/InvoicesPage').then((module) => ({ default: module.InvoicesPage })),
)
const JoinInvitationPage = lazy(
  () => import('../pages/JoinInvitationPage').then((module) => ({ default: module.JoinInvitationPage })),
)
const LoginPage = lazy(
  () => import('../pages/LoginPage').then((module) => ({ default: module.LoginPage })),
)
const NewIncomingInvoicePage = lazy(
  () => import('../pages/NewIncomingInvoicePage').then((module) => ({ default: module.NewIncomingInvoicePage })),
)
const NewInventoryItemPage = lazy(() => import('../pages/NewInventoryItemPage'))
const NewInvoicePage = lazy(
  () => import('../pages/NewInvoicePage').then((module) => ({ default: module.NewInvoicePage })),
)
const NewOfferPage = lazy(
  () => import('../pages/NewOfferPage').then((module) => ({ default: module.NewOfferPage })),
)
const NewWorkOrderPage = lazy(
  () => import('../pages/NewWorkOrderPage').then((module) => ({ default: module.NewWorkOrderPage })),
)
const NotificationSettingsPage = lazy(
  () => import('../pages/NotificationSettingsPage').then((module) => ({ default: module.NotificationSettingsPage })),
)
const NotFoundPage = lazy(
  () => import('../pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
)
const OfferDetailsPage = lazy(
  () => import('../pages/OfferDetailsPage').then((module) => ({ default: module.OfferDetailsPage })),
)
const PricingPage = lazy(
  () => import('../pages/PricingPage').then((module) => ({ default: module.PricingPage })),
)
const ProfilePage = lazy(
  () => import('../pages/ProfilePage').then((module) => ({ default: module.ProfilePage })),
)
const RegisterPage = lazy(
  () => import('../pages/RegisterPage').then((module) => ({ default: module.RegisterPage })),
)
const LegalPage = lazy(
  () => import('../pages/LegalPage').then((module) => ({ default: module.LegalPage })),
)
const ReferralLandingPage = lazy(
  () => import('../pages/ReferralLandingPage').then((module) => ({ default: module.ReferralLandingPage })),
)
const ResetPasswordPage = lazy(
  () => import('../pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })),
)
const SettingsPage = lazy(
  () => import('../pages/SettingsPage').then((module) => ({ default: module.SettingsPage })),
)
const SupportPage = lazy(
  () => import('../pages/SupportPage').then((module) => ({ default: module.SupportPage })),
)
const VehicleDetailsPage = lazy(
  () => import('../pages/VehicleDetailsPage').then((module) => ({ default: module.VehicleDetailsPage })),
)
const VehiclesPage = lazy(
  () => import('../pages/VehiclesPage').then((module) => ({ default: module.VehiclesPage })),
)
const WorkOrderDetailsPage = lazy(
  () => import('../pages/WorkOrderDetailsPage').then((module) => ({ default: module.WorkOrderDetailsPage })),
)
const WorkOrderSettingsPage = lazy(
  () => import('../pages/WorkOrderSettingsPage').then((module) => ({ default: module.WorkOrderSettingsPage })),
)

type RouteWrapperProps = { children: ReactNode }

function ProtectedRoute({ children }: RouteWrapperProps) {
  const {
    session,
    membership,
    isLoading,
    isAccessLoading,
    companySetupError,
    retryCompanySetup,
  } = useAuth()
  const { isLoading: isSubscriptionLoading, error: subscriptionError } = useSubscription()

  if (isLoading || isAccessLoading || isSubscriptionLoading) {
    return <FersysLoader fullScreen text="Provjera korisničkog računa..." />
  }
  if (!session) return <Navigate to="/login" replace />
  if (companySetupError || subscriptionError) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-950 p-5 text-white">
        <div className="w-full max-w-lg rounded-3xl border border-red-500/20 bg-slate-900 p-6 text-center">
          <h1 className="text-xl font-black">Tvrtka nije pripremljena</h1>
          <p className="mt-3 break-words text-sm leading-6 text-slate-400">{companySetupError || subscriptionError}</p>
          <button type="button" onClick={() => void retryCompanySetup()} className="mt-5 min-h-11 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white">Pokušaj ponovno</button>
        </div>
      </div>
    )
  }
  if (!membership || membership.status !== 'active') {
    return <AccessDeniedPage title="Račun nema aktivan pristup" description="Obrati se vlasniku ili administratoru tvrtke." />
  }
  return children
}

function PermissionRoute({ permission, children }: { permission: PermissionKey; children: ReactNode }) {
  const { can } = useAuth()
  if (!can(permission)) return <AccessDeniedPage title="Pristup nije dopušten" description="Nemaš dopuštenje za pregled ovog dijela FERSYS-a." />
  return children
}

function PlanRoute({ feature, children }: { feature: SubscriptionFeature; children: ReactNode }) {
  const { hasFeature } = useSubscription()
  if (!hasFeature(feature)) return <PlanLock feature={feature} requiredPlan={featureRequiredPlan[feature]} />
  return children
}

function BusinessPlanRoute({ children }: RouteWrapperProps) {
  const { subscription, isTrialing } = useSubscription()
  if (isTrialing) return children
  if (subscription?.planId !== 'business' && subscription?.planId !== 'pro') {
    return <PlanLock feature="inventory" requiredPlan="business" />
  }
  return children
}

function AccessDeniedPage({ title, description }: { title: string; description: string }) {
  return (
    <main className="grid min-h-[65vh] place-items-center px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-amber-500/20 bg-slate-900 p-7 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/10 text-2xl">🔒</div>
        <h1 className="mt-5 text-2xl font-black">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
        <a href="/dashboard" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white">Povratak na Dashboard</a>
      </div>
    </main>
  )
}

function PublicOnlyRoute({ children }: RouteWrapperProps) {
  const { session, isLoading } = useAuth()
  if (isLoading) return <FersysLoader fullScreen text="Učitavanje FERSYS-a..." />
  return session ? <Navigate to="/dashboard" replace /> : children
}

function Guard({ permission, feature, children }: { permission: PermissionKey; feature?: SubscriptionFeature; children: ReactNode }) {
  const content = feature ? <PlanRoute feature={feature}>{children}</PlanRoute> : children
  return <PermissionRoute permission={permission}>{content}</PermissionRoute>
}

function RouterContent() {
  const { session, isLoading } = useAuth()

  return (
    <Suspense fallback={<FersysLoader fullScreen text="Učitavanje FERSYS modula..." />}>
      <WorkOrderPhotoGallerySync />
      <Routes>
        <Route path="/" element={isLoading ? <FersysLoader fullScreen text="Pokretanje FERSYS-a..." /> : <Navigate to={session ? '/dashboard' : '/login'} replace />} />
        <Route path="/join" element={<JoinInvitationPage />} />
        <Route path="/r/:code" element={<ReferralLandingPage />} />
        <Route path="/terms" element={<LegalPage />} />
        <Route path="/privacy" element={<LegalPage />} />
        <Route path="/refund-policy" element={<LegalPage />} />
        <Route path="/cookies" element={<LegalPage />} />
        <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute><AdminGuard><AdminLayout /></AdminGuard></ProtectedRoute>}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/companies" element={<AdminCompaniesPage />} />
          <Route path="/admin/companies/:companyId" element={<AdminCompanyDetailsPage />} />
          <Route path="/admin/rewards" element={<AdminRewardsPage />} />
          <Route path="/admin/email" element={<AdminEmailCenterPage />} />
          <Route path="/admin/support" element={<AdminSupportPage />} />
        </Route>

        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/account" element={<AccountPage />} />
          <Route path="/dashboard" element={<Guard permission="dashboard.view"><DashboardPage /></Guard>} />
          <Route path="/support" element={<Guard permission="dashboard.view"><SupportPage /></Guard>} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/offers" element={<Guard permission="offers.view" feature="offers"><OffersPage /></Guard>} />
          <Route path="/offers/:offerId" element={<Guard permission="offers.view" feature="offers"><OfferDetailsPage /></Guard>} />
          <Route path="/offers/new" element={<Guard permission="offers.manage" feature="offers"><NewOfferPage /></Guard>} />
          <Route path="/offers/:offerId/edit" element={<Guard permission="offers.manage" feature="offers"><NewOfferPage /></Guard>} />
          <Route path="/settings/employees" element={<Guard permission="employees.view" feature="employees"><EmployeesPage /></Guard>} />
          <Route path="/settings/notifications" element={<Guard permission="dashboard.view"><NotificationSettingsPage /></Guard>} />
          <Route path="/ai" element={<Guard permission="ai.use" feature="ai"><AiAssistantPage /></Guard>} />
          <Route path="/invoices" element={<Guard permission="invoices.view" feature="invoices"><InvoicesPage /></Guard>} />
          <Route path="/invoices/new" element={<Guard permission="invoices.view" feature="invoices"><NewInvoicePage /></Guard>} />
          <Route path="/invoices/:invoiceId/edit" element={<Guard permission="invoices.view" feature="invoices"><NewInvoicePage /></Guard>} />
          <Route path="/incoming-invoices" element={<Guard permission="incomingInvoices.view" feature="incoming_invoices"><IncomingInvoicesPage /></Guard>} />
          <Route path="/incoming-invoices/new" element={<Guard permission="incomingInvoices.view" feature="incoming_invoices"><NewIncomingInvoicePage /></Guard>} />
          <Route path="/incoming-invoices/:incomingInvoiceId/edit" element={<Guard permission="incomingInvoices.view" feature="incoming_invoices"><NewIncomingInvoicePage /></Guard>} />
          <Route path="/inventory" element={<Guard permission="inventory.view" feature="inventory"><InventoryPage /></Guard>} />
          <Route path="/inventory/delivery-notes" element={<Guard permission="inventory.view" feature="inventory"><DeliveryNotesPage /></Guard>} />
          <Route path="/inventory/delivery-notes/new" element={<Guard permission="inventory.manage" feature="inventory"><NewDeliveryNotePage /></Guard>} />
          <Route path="/inventory/delivery-notes/:id" element={<Guard permission="inventory.view" feature="inventory"><DeliveryNoteDetailsPage /></Guard>} />
          <Route path="/settings/delivery-notes" element={<Guard permission="settings.manage" feature="inventory"><DeliveryNoteSettingsPage /></Guard>} />
          <Route path="/inventory/items/new" element={<Guard permission="inventory.manage" feature="inventory"><NewInventoryItemPage /></Guard>} />
          <Route path="/inventory/items/:id" element={<Guard permission="inventory.view" feature="inventory"><InventoryItemDetailsPage /></Guard>} />
          <Route path="/inventory/items/:id/edit" element={<Guard permission="inventory.manage" feature="inventory"><NewInventoryItemPage /></Guard>} />
          <Route path="/inventory/scan" element={<Guard permission="inventory.view" feature="inventory"><InventoryQrScannerPage /></Guard>} />
          <Route path="/inventory/movements" element={<Guard permission="inventory.view" feature="inventory"><InventoryMovementsPage /></Guard>} />
          <Route path="/calendar" element={<Guard permission="calendar.view" feature="calendar"><CalendarPage /></Guard>} />
          <Route path="/vehicles" element={<PermissionRoute permission="vehicles.view"><BusinessPlanRoute><VehiclesPage /></BusinessPlanRoute></PermissionRoute>} />
          <Route path="/vehicles/:id" element={<PermissionRoute permission="vehicles.view"><BusinessPlanRoute><VehicleDetailsPage /></BusinessPlanRoute></PermissionRoute>} />
          <Route path="/customers" element={<Guard permission="customers.view" feature="customers"><CustomersPage /></Guard>} />
          <Route path="/customers/:id" element={<Guard permission="customers.view" feature="customers"><CustomerProfilePage /></Guard>} />
          <Route path="/work-orders" element={<Guard permission="workOrders.view" feature="work_orders"><WorkOrdersPage /></Guard>} />
          <Route path="/work-orders/new" element={<Guard permission="workOrders.manage" feature="work_orders"><NewWorkOrderPage /></Guard>} />
          <Route path="/work-orders/:id/edit" element={<Guard permission="workOrders.manage" feature="work_orders"><EditWorkOrderPage /></Guard>} />
          <Route path="/work-orders/:id" element={<Guard permission="workOrders.view" feature="work_orders"><WorkOrderDetailsPage /></Guard>} />
          <Route path="/settings/work-orders" element={<Guard permission="settings.manage"><WorkOrderSettingsPage /></Guard>} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<Guard permission="settings.manage"><SettingsPage /></Guard>} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export function AppRouter() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <ReferralClaimBridge />
        <DeliveryNoteContextShortcut />
        <RouterContent />
      </SubscriptionProvider>
    </AuthProvider>
  )
}