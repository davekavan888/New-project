import React, { useState, useEffect } from 'react'
import {
  Search,
  Landmark,
  ShieldAlert,
  CandlestickChart,
  User,
  Lock,
  ScrollText,
  Download,
  Calendar,
  Layers,
} from 'lucide-react'
import {
  FoDecisionDesk,
  UniversalStockScreener,
  InstitutionalFlowsDesk,
  VisualNewsWireDesk,
  SectorEtfMatrix,
  RiskProtocolDesk,
  HistoricalReportDesk,
} from '@/pages/ExtraPages'

const SESSION_KEY = 'novaforge_auth_session'
type Tab = 'fo' | 'history' | 'screener' | 'fii_dii' | 'news' | 'etf' | 'risk'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem(SESSION_KEY) === 'true',
  )
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [currentTab, setCurrentTab] = useState<Tab>('fo')
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [installMsg, setInstallMsg] = useState('')

  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setAuthError('Enter ID and passkey')
      return
    }
    localStorage.setItem(SESSION_KEY, 'true')
    setIsAuthenticated(true)
    setAuthError('')
  }

  const onInstall = async () => {
    if (!deferredPrompt) {
      setInstallMsg('Browser menu → Install app')
      return
    }
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <div className="text-center mb-6 space-y-1">
            <h1 className="text-2xl font-black tracking-wide text-slate-900">NOVAFORGE</h1>
            <p className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
              Decision desk v7
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            {authError ? <p className="text-center text-sm text-rose-600">{authError}</p> : null}
            <label className="block text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1 mb-1">
                <User className="w-3.5 h-3.5" /> Trader ID
              </span>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1 mb-1">
                <Lock className="w-3.5 h-3.5" /> Passkey
              </span>
              <input
                type="password"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="w-full py-3 rounded-xl font-bold text-white bg-slate-900"
            >
              Enter desk
            </button>
          </form>
        </div>
      </div>
    )
  }

  const nav: { id: Tab; label: string; icon: typeof Search }[] = [
    { id: 'fo', label: 'Trade Desk + Locks', icon: CandlestickChart },
    { id: 'history', label: 'Report Card', icon: ScrollText },
    { id: 'screener', label: 'Charts', icon: Search },
    { id: 'fii_dii', label: 'FII / DII', icon: Landmark },
    { id: 'news', label: 'Events', icon: Calendar },
    { id: 'etf', label: 'ETFs', icon: Layers },
    { id: 'risk', label: 'Risk', icon: ShieldAlert },
  ]

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900">
      <aside className="w-full md:w-60 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <div className="font-black tracking-wide text-slate-900">NOVAFORGE</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">v7 results</div>
        </div>
        <nav className="p-2 space-y-1 flex-1">
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                currentTab === item.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-200 space-y-2">
          <button
            type="button"
            onClick={() => void onInstall()}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700"
          >
            <Download className="w-4 h-4" /> Install app
          </button>
          {installMsg ? <p className="text-[10px] text-slate-400">{installMsg}</p> : null}
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(SESSION_KEY)
              setIsAuthenticated(false)
            }}
            className="text-[11px] text-slate-500"
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 px-4 flex items-center justify-between border-b border-slate-200 bg-white">
          <span className="text-xs font-semibold text-slate-600">
            {currentTab === 'fo' && 'ORB · CALL/PUT · Locks · 45m audit'}
            {currentTab === 'history' && '5-day report · expectancy'}
            {currentTab === 'screener' && 'Charts'}
            {currentTab === 'fii_dii' && 'FII / DII'}
            {currentTab === 'news' && 'Events'}
            {currentTab === 'etf' && 'ETFs'}
            {currentTab === 'risk' && 'Risk'}
          </span>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
            Desk live
          </span>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'fo' && <FoDecisionDesk />}
            {currentTab === 'history' && <HistoricalReportDesk />}
            {currentTab === 'screener' && <UniversalStockScreener />}
            {currentTab === 'fii_dii' && <InstitutionalFlowsDesk />}
            {currentTab === 'news' && <VisualNewsWireDesk />}
            {currentTab === 'etf' && <SectorEtfMatrix />}
            {currentTab === 'risk' && <RiskProtocolDesk />}
          </div>
        </main>
      </div>
    </div>
  )
}
