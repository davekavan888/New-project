import React, { useState, useEffect } from 'react'
import {
  Search,
  Landmark,
  ShieldAlert,
  CandlestickChart,
  User,
  Lock,
  History,
  Download,
  Trees,
  ScrollText,
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
      setInstallMsg('Use browser: Install app / Add to Home Screen')
      return
    }
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-50">
        <div className="w-full max-w-md rounded-[2rem] border-2 border-amber-300/80 bg-white/90 backdrop-blur shadow-2xl shadow-amber-200/50 p-8 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-200/40 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-sky-200/50 blur-2xl" />
          <div className="relative text-center space-y-2 mb-6">
            <div className="text-5xl">🌿</div>
            <h1 className="text-2xl font-serif font-black tracking-[0.2em] text-slate-800">NOVAFORGE</h1>
            <p className="text-[11px] uppercase tracking-[0.25em] text-amber-700 font-semibold">Wealth Decision Desk</p>
          </div>
          <form onSubmit={handleLogin} className="relative space-y-4">
            {authError ? (
              <p className="text-center text-sm text-rose-600 bg-rose-50 rounded-xl py-2">{authError}</p>
            ) : null}
            <label className="block text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1 mb-1"><User className="w-3.5 h-3.5 text-amber-600" /> Trader ID</span>
              <input
                className="w-full rounded-2xl border border-amber-200 bg-sky-50/50 px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1 mb-1"><Lock className="w-3.5 h-3.5 text-amber-600" /> Passkey</span>
              <input
                type="password"
                className="w-full rounded-2xl border border-amber-200 bg-sky-50/50 px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="w-full py-3 rounded-2xl font-bold text-slate-900 bg-gradient-to-r from-amber-300 via-yellow-200 to-lime-300 shadow-lg shadow-amber-200/60 hover:brightness-105"
            >
              Open Desk
            </button>
          </form>
        </div>
      </div>
    )
  }

  const nav: { id: Tab; label: string; icon: typeof Search }[] = [
    { id: 'fo', label: 'Trade Desk + Locks', icon: CandlestickChart },
    { id: 'history', label: 'Report Card Archive', icon: ScrollText },
    { id: 'screener', label: 'Stock Charts', icon: Search },
    { id: 'fii_dii', label: 'FII / DII', icon: Landmark },
    { id: 'news', label: 'Event Calendar', icon: Trees },
    { id: 'etf', label: 'ETF Ideas', icon: History },
    { id: 'risk', label: 'Risk Rules', icon: ShieldAlert },
  ]

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-sky-50 via-white to-emerald-50 text-slate-800">
      <aside className="w-full md:w-64 shrink-0 border-r border-amber-200/80 bg-gradient-to-b from-white via-sky-50 to-emerald-50/80 flex flex-col">
        <div className="p-5 border-b border-amber-200/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-300 to-lime-300 flex items-center justify-center text-xl shadow-md">N</div>
            <div>
              <div className="font-serif font-black tracking-wide text-slate-800">NOVAFORGE</div>
              <div className="text-[10px] uppercase tracking-widest text-amber-700 font-bold">Alpha Desk</div>
            </div>
          </div>
        </div>
        <nav className="p-3 space-y-1.5 flex-1">
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                currentTab === item.id
                  ? 'bg-gradient-to-r from-amber-300 to-lime-300 text-slate-900 shadow-md shadow-amber-200/50'
                  : 'text-slate-600 hover:bg-white/80 border border-transparent hover:border-amber-100'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-amber-200/70 space-y-2">
          <button
            type="button"
            onClick={() => void onInstall()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-bold bg-white border border-amber-300 text-amber-800"
          >
            <Download className="w-4 h-4" /> Install App
          </button>
          {installMsg ? <p className="text-[10px] text-slate-500">{installMsg}</p> : null}
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(SESSION_KEY)
              setIsAuthenticated(false)
            }}
            className="text-[11px] text-slate-500 hover:text-amber-800"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 px-5 flex items-center justify-between border-b border-amber-200/70 bg-white/70 backdrop-blur">
          <span className="text-xs font-semibold text-slate-600">
            {currentTab === 'fo' && 'Trade locks · ORB · CALL / PUT'}
            {currentTab === 'history' && 'Document archive · 5 working days'}
            {currentTab === 'screener' && 'Charts'}
            {currentTab === 'fii_dii' && 'Flows'}
            {currentTab === 'news' && 'Event risk'}
            {currentTab === 'etf' && 'ETFs'}
            {currentTab === 'risk' && 'Risk'}
          </span>
          <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold">
            Live desk ready
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
