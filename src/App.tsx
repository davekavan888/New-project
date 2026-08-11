import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { MarketsPage } from '@/pages/markets/MarketsPage'
import { StockDetailsPage } from '@/pages/markets/StockDetailsPage'
import { PortfolioPage } from '@/pages/portfolio/PortfolioPage'
import { WatchlistPage } from '@/pages/portfolio/WatchlistPage'
import { AICopilotPage } from '@/pages/ai/AICopilotPage'
import { HintsPage } from '@/pages/HintsPage'
import { MorningBriefPage } from '@/pages/MorningBriefPage'
import { AnalysisPage } from '@/pages/AnalysisPage'
import { IdeasPage } from '@/pages/IdeasPage'
import {
  NewsPage,
  InstitutionalPage,
  ScreenersPage,
  ThemesPage,
  CalendarPage,
  SettingsPage,
} from '@/pages/SimplePages'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
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
        <Route path="/hints" element={<HintsPage />} />
        <Route path="/morning" element={<MorningBriefPage />} />
        <Route path="/ideas" element={<IdeasPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/markets" element={<MarketsPage />} />
        <Route path="/stocks/:symbol" element={<StockDetailsPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/institutional" element={<InstitutionalPage />} />
        <Route path="/ai" element={<AICopilotPage />} />
        <Route path="/screeners" element={<ScreenersPage />} />
        <Route path="/themes" element={<ThemesPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
