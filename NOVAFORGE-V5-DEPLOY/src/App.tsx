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
      setInstallMsg('Browser menu → Install app')
      return
    }
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-[#13110d] to-amber-950">
        <div className="w-full max-w-md rounded-[2rem] border-2 border-amber-500/50 bg-slate-900/90 p-8 shadow-2xl">
          <div className="text-center mb-6 space-y-2">
            <div className="text-4xl">🏛️</div>
            <h1 className="text-2xl font-serif font-black tracking-[0.2em] text-amber-100">NOVAFORGE</h1>
            <p className="text-[11px] uppercase tracking-[0.25em] text-amber-400 font-semibold">Decision Desk v5</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            {authError ? <p className="text-center text-sm text-rose-400">{authError}</p> : null}
            <label className="block text-xs font-semibold text-amber-200/80">
              <span className="flex items-center gap-1 mb-1"><User className="w-3.5 h-3.5" /> Trader ID</span>
              <input className="w-full rounded-2xl border border-amber-500/40 bg-black/50 px-4 py-2.5 text-amber-50" value={username} onChange={(e) => setUsername(e.target.value)} />
            </label>
            <label className="block text-xs font-semibold text-amber-200/80">
              <span className="flex items-center gap-1 mb-1"><Lock className="w-3.5 h-3.5" /> Passkey</span>
              <input type="password" className="w-full rounded-2xl border border-amber-500/40 bg-black/50 px-4 py-2.5 text-amber-50" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <button type="submit" className="w-full py-3 rounded-2xl font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500">
              Enter Desk
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
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-slate-950 via-[#0c0a09] to-[#1c1408] text-amber-50">
      <aside className="w-full md:w-64 shrink-0 border-r border-amber-500/30 bg-black/40 flex flex-col">
        <div className="p-5 border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 flex items-center justify-center font-black">N</div>
            <div>
              <div className="font-serif font-black tracking-wide text-amber-100">NOVAFORGE</div>
              <div className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">v5 Desk</div>
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
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md'
                  : 'text-amber-100/70 hover:bg-amber-500/10'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-amber-500/30 space-y-2">
          <button type="button" onClick={() => void onInstall()} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-bold border border-amber-500/50 text-amber-300">
            <Download className="w-4 h-4" /> Install App
          </button>
          {installMsg ? <p className="text-[10px] text-slate-400">{installMsg}</p> : null}
          <button type="button" onClick={() => { localStorage.removeItem(SESSION_KEY); setIsAuthenticated(false) }} className="text-[11px] text-amber-500/80">
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 px-5 flex items-center justify-between border-b border-amber-500/20 bg-black/30">
          <span className="text-xs font-semibold text-amber-200/80">
            {currentTab === 'fo' && 'Locks · ORB · CALL/PUT · 45m audit'}
            {currentTab === 'history' && '5-day report card'}
            {currentTab === 'screener' && 'Charts'}
            {currentTab === 'fii_dii' && 'Flows'}
            {currentTab === 'news' && 'Events'}
            {currentTab === 'etf' && 'ETFs'}
            {currentTab === 'risk' && 'Risk'}
          </span>
          <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-semibold">Desk live</span>
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
