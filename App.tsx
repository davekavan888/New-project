import React, { useState, useEffect } from 'react'
import {
  Search,
  Newspaper,
  Globe,
  Landmark,
  ShieldAlert,
  Atom,
  User,
  Lock,
  History,
  Download,
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

type Tab =
  | 'fo'
  | 'history'
  | 'screener'
  | 'fii_dii'
  | 'news'
  | 'etf'
  | 'risk'

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
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setAuthError('Enter both Terminal ID and Passkey.')
      return
    }
    localStorage.setItem(SESSION_KEY, 'true')
    localStorage.setItem('novaforge_trader_id', username.trim())
    setIsAuthenticated(true)
    setAuthError('')
  }

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY)
    setIsAuthenticated(false)
  }

  const onInstall = async () => {
    if (!deferredPrompt) {
      setInstallMsg('Use browser menu: Install app / Add to Home Screen.')
      return
    }
    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setInstallMsg(choice.outcome === 'accepted' ? 'Install started' : 'Dismissed')
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#050914] via-[#091326] to-[#040812] text-[#F8FAFC] flex items-center justify-center p-4 font-sans antialiased">
        <div className="w-full max-w-sm bg-[#0D182E] border-2 border-[#D4AF37]/50 rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
          <div className="text-center space-y-3 mb-6">
            <div className="flex justify-center items-center gap-3 text-3xl select-none">
              <span className="scale-x-[-1] inline-block drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">
                🐘
              </span>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#D4AF37] to-[#F7E7A9] flex items-center justify-center text-xl shadow-lg text-[#070E1C] font-bold">
                🏛️
              </div>
              <span className="drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">🐘</span>
            </div>
            <h1 className="text-2xl font-serif font-black tracking-widest text-[#FDFBF7]">
              NOVAFORGE
            </h1>
            <p className="text-[11px] font-mono text-[#D4AF37] uppercase tracking-wider font-bold">
              Quantum Sovereign Terminal
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4 font-mono text-xs">
            {authError ? (
              <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-center text-[11px]">
                {authError}
              </div>
            ) : null}
            <div className="space-y-1">
              <label className="text-[#94A3B8] flex items-center gap-1.5 font-semibold">
                <User className="w-3.5 h-3.5 text-[#D4AF37]" /> Trader Terminal ID
              </label>
              <input
                type="text"
                placeholder="Enter Trader ID..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#070E1C] border border-[#D4AF37]/30 rounded-xl px-3.5 py-2.5 text-[#FDFBF7] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[#94A3B8] flex items-center gap-1.5 font-semibold">
                <Lock className="w-3.5 h-3.5 text-[#D4AF37]" /> Access Passkey
              </label>
              <input
                type="password"
                placeholder="Enter Passkey..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#070E1C] border border-[#D4AF37]/30 rounded-xl px-3.5 py-2.5 text-[#FDFBF7] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <button
              type="submit"
              className="w-full mt-2 bg-gradient-to-r from-[#D4AF37] to-[#B38F26] text-[#070D1E] font-bold py-2.5 rounded-xl uppercase tracking-wider hover:brightness-110 flex items-center justify-center gap-2 shadow-lg"
            >
              Authenticate Gateway 🗝️
            </button>
          </form>
          <div className="mt-5 pt-3 border-t border-[#D4AF37]/15 flex justify-between text-[10px] font-mono text-[#64748B]">
            <span>SESSION: PERSISTENT</span>
            <span className="text-emerald-400">● DEVICE STORED</span>
          </div>
        </div>
      </div>
    )
  }

  const nav: { id: Tab; label: string; icon: typeof Search; live?: boolean }[] = [
    { id: 'fo', label: 'Quantum F&O Horizon', icon: Atom, live: true },
    { id: 'history', label: '5-Day Report Card', icon: History },
    { id: 'screener', label: 'All-Stock Screener', icon: Search },
    { id: 'fii_dii', label: 'FII / DII Flow Engine', icon: Landmark },
    { id: 'news', label: 'Live Market Wire', icon: Newspaper },
    { id: 'etf', label: 'Sector & Thematic ETFs', icon: Globe },
    { id: 'risk', label: 'Capital & Risk Protocol', icon: ShieldAlert },
  ]

  const titles: Record<Tab, string> = {
    fo: '⚛️ Quantum F&O · Real LTP Locks · CALL/PUT',
    history: '📊 5-Day Report Card · HIT + MISS',
    screener: '🔍 Stock Screener & Charts',
    fii_dii: '🏛️ FII / DII',
    news: '📡 India Market Wire',
    etf: '🌐 Sector ETFs',
    risk: '🛡️ Risk Protocol',
  }

  return (
    <div className="min-h-screen bg-[#070E1C] text-[#F8FAFC] flex flex-col md:flex-row antialiased font-sans">
      <aside className="w-full md:w-64 bg-[#0D182E] border-r border-[#D4AF37]/20 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-5 border-b border-[#D4AF37]/20 bg-[#12203D]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#F7E7A9] text-[#070E1C] font-bold flex items-center justify-center text-lg shadow-md">
                🏛️
              </div>
              <div>
                <h1 className="font-serif font-black tracking-wider text-base text-[#FDFBF7]">
                  NOVAFORGE
                </h1>
                <p className="text-[10px] font-mono tracking-widest text-[#D4AF37] uppercase font-bold">
                  Quantum Alpha Desk
                </p>
              </div>
            </div>
          </div>
          <nav className="p-3 space-y-1.5 text-xs font-mono font-bold">
            {nav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                  currentTab === item.id
                    ? 'bg-[#D4AF37] text-[#070E1C] shadow-md'
                    : 'text-[#94A3B8] hover:bg-[#16274A] hover:text-[#F8FAFC]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </span>
                {item.live ? (
                  <span className="text-[10px] bg-[#070E1C] text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-400/40">
                    LIVE
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-[#D4AF37]/20 bg-[#070E1C] space-y-2">
          <button
            type="button"
            onClick={() => void onInstall()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37]"
          >
            <Download className="w-4 h-4" /> Install App
          </button>
          {installMsg ? (
            <p className="text-[10px] text-[#94A3B8]">{installMsg}</p>
          ) : null}
          <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B]">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              FEED
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-[#D4AF37] hover:underline"
            >
              Lock 🗝️
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[#070E1C]">
        <header className="h-16 border-b border-[#D4AF37]/20 bg-[#0D182E] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-xs font-mono min-w-0">
            <span className="text-[#D4AF37] font-bold shrink-0">NOVAFORGE</span>
            <span className="text-[#64748B]">/</span>
            <span className="text-[#F8FAFC] font-semibold truncate">
              {titles[currentTab]}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
            ● DESK LIVE
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto bg-[#070E1C]">
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
