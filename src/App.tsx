import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { MorningBriefPage } from '@/pages/MorningBriefPage'
import { LiveTerminalPage } from '@/pages/workspace/LiveTerminalPage'
import { AICopilotPage } from '@/pages/ai/AICopilotPage'
import { WatchlistPage } from '@/pages/portfolio/WatchlistPage'
import {
  InstitutionalPage,
  SettingsPage,
} from '@/pages/SimplePages'
import { Forecast30Page } from '@/pages/Forecast30Page'
import {
  OptionsAnalyticsPage,
  ScannersAdvancedPage,
  AlertsPage,
} from '@/pages/MarketPulsePages'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/morning" element={<MorningBriefPage />} />
        <Route path="/forecast30" element={<Forecast30Page />} />
        <Route path="/live" element={<LiveTerminalPage />} />
        <Route path="/scanners" element={<ScannersAdvancedPage />} />
        <Route path="/options" element={<OptionsAnalyticsPage />} />
        <Route path="/institutional" element={<InstitutionalPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/ai" element={<AICopilotPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
