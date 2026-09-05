import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { DecisionPage } from '@/pages/DecisionPage'
import { MorningBriefPage } from '@/pages/MorningBriefPage'
import { LiveTerminalPage } from '@/pages/workspace/LiveTerminalPage'
import { SettingsPage } from '@/pages/SimplePages'
import { OptionChainPage } from '@/pages/OptionChainPage'
import { ReportCardPage } from '@/pages/ReportCardPage'
import {
  StockSearchPage,
  StockDetailPage,
  NewsIntelPage,
  IpoDeskPage,
} from '@/pages/ExtraPages'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/decision" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/decision" element={<DecisionPage />} />
        <Route path="/dashboard" element={<Navigate to="/decision" replace />} />
        <Route path="/morning" element={<MorningBriefPage />} />
        <Route path="/chain" element={<OptionChainPage />} />
        <Route path="/live" element={<LiveTerminalPage />} />
        <Route path="/report-card" element={<ReportCardPage />} />
        <Route path="/search" element={<StockSearchPage />} />
        <Route path="/stock/:symbol" element={<StockDetailPage />} />
        <Route path="/news" element={<NewsIntelPage />} />
        <Route path="/ipo" element={<IpoDeskPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/forecast30" element={<Navigate to="/decision" replace />} />
        <Route path="/numerology" element={<Navigate to="/decision" replace />} />
        <Route path="/scanners" element={<Navigate to="/decision" replace />} />
        <Route path="/options" element={<Navigate to="/chain" replace />} />
        <Route path="/ai" element={<Navigate to="/decision" replace />} />
        <Route path="/watchlist" element={<Navigate to="/decision" replace />} />
        <Route path="/alerts" element={<Navigate to="/decision" replace />} />
        <Route path="/institutional" element={<Navigate to="/morning" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/decision" replace />} />
    </Routes>
  )
}
