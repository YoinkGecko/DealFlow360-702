import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AppShell } from "./components/AppShell"
import { RequireSession } from "./components/RequireSession"
import { ApprovalsPage } from "./pages/ApprovalsPage"
import { DashboardPage } from "./pages/DashboardPage"
import { LoginPage } from "./pages/LoginPage"
import { QuotationBuilderPage } from "./pages/QuotationBuilderPage"
import { QuotationsPage } from "./pages/QuotationsPage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireSession />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/quotations" element={<QuotationsPage />} />
            <Route path="/quotations/new" element={<QuotationBuilderPage />} />
            <Route path="/quotations/:id" element={<QuotationBuilderPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
