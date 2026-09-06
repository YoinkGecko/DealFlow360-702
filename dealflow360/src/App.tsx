import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { AppLayout } from './components/layout/AppLayout'
import { LandingPage } from './pages/marketing/LandingPage'
import { LoginPage, SignupPage } from './pages/auth/AuthPages'
import { OverviewPage } from './pages/app/OverviewPage'
import { DealsPage, DealWorkspacePage } from './pages/app/DealsPages'
import { ApprovalsPage, CustomersPage, ProductsPage, PoliciesPage } from './pages/app/CorePages'
import {
  FulfillmentPage,
  BillingPage,
  SubscriptionsPage,
  RecommendationsPage,
  DealHealthPage,
  AnalyticsPage,
} from './pages/app/OperationsPages'
import { PortalQuotePage } from './pages/portal/PortalQuotePage'
import {
  WarehousesPage,
  SettingsPage,
  HelpPage,
  ProfilePage,
} from './pages/app/SystemPages'

function ProtectedApp() {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8] text-sm text-[#6b7280]">
        Loading…
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}

function AppShell() {
  return (
    <AppLayout>
      <Routes>
        <Route index element={<OverviewPage />} />
        <Route path="deals" element={<DealsPage />} />
        <Route path="deals/:id" element={<DealWorkspacePage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="policies" element={<PoliciesPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="fulfillment" element={<FulfillmentPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="recommendations" element={<RecommendationsPage />} />
        <Route path="deal-health" element={<DealHealthPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="audit" element={<Navigate to="/app/deals" replace />} />
        <Route path="what-if" element={<Navigate to="/app/deals" replace />} />
        <Route path="warehouses" element={<WarehousesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="help" element={<HelpPage />} />
      </Routes>
    </AppLayout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/portal/quote/:token" element={<PortalQuotePage />} />
          <Route path="/app/*" element={<ProtectedApp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
