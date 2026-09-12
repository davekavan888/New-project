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
      setAuthError('Enter Terminal ID and Passkey.')
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
      setInstallMsg('Browser menu → Install app / Add to Home Screen')
      return
    }
    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setInstallMsg(choice.outcome === 'accepted' ? 'Installing…' : 'Dismissed')
  }

  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 font-sans antialiased"
        style={{
          background:
            'radial-gradient(ellipse at top, #3d5a80 0%, #1b3a4b 40%, #0f2027 100%)',
        }}
      >
        <div className="w-full max-w-md rounded-3xl p-8 relative overflow-hidden border-2 border-[#c9a227]/60 shadow-2xl bg-gradient-to-b from-[#2c4a6e] to-[#1a3348]">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#f0d77b] to-transparent" />
          <div className="text-center space-y-3 mb-7">
            <div className="text-4xl select-none">🏛️</div>
            <h1 className="text-2xl font-serif font-black tracking-[0.2em] text-[#f7f0dd]">
              NOVAFORGE
            </h1>
            <p className="text-[11px] tracking-[0.25em] uppercase text-[#e8c547] font-semibold">
              Royal Decision Palace
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4 text-sm">
            {authError ? (
              <div className="text-center text-rose-200 text-xs bg-rose-900/30 border border-rose-400/40 rounded-xl py-2">
                {authError}
              </div>
            ) : null}
            <label className="block text-[#d4c4a8] text-xs font-semibold">
              <span className="flex items-center gap-1.5 mb-1">
                <User className="w-3.5 h-3.5 text-[#e8c547]" /> Trader ID
              </span>
              <input
                className="w-full rounded-xl px-3.5 py-2.5 bg-[#0f2433]/80 border border-[#c9a227]/40 text-[#f7f0dd] focus:outline-none focus:border-[#f0d77b]"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your ID"
              />
            </label>
            <label className="block text-[#d4c4a8] text-xs font-semibold">
              <span className="flex items-center gap-1.5 mb-1">
                <Lock className="w-3.5 h-3.5 text-[#e8c547]" /> Passkey
              </span>
              <input
                type="password"
                className="w-full rounded-xl px-3.5 py-2.5 bg-[#0f2433]/80 border border-[#c9a227]/40 text-[#f7f0dd] focus:outline-none focus:border-[#f0d77b]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Passkey"
              />
            </label>
            <button
              type="submit"
              className="w-full py-3 rounded-xl font-bold tracking-wider uppercase text-[#1a2a1a] bg-gradient-to-r from-[#e8c547] via-[#f0d77b] to-[#c9a227] shadow-lg hover:brightness-110"
            >
              Enter Palace 🗝️
            </button>
          </form>
        </div>
      </div>
    )
  }

  const nav: { id: Tab; label: string; icon: typeof Search }[] = [
    { id: 'fo', label: 'F&O Throne Desk', icon: Atom },
    { id: 'history', label: 'Royal Report Card', icon: History },
    { id: 'screener', label: 'Equity Gallery', icon: Search },
    { id: 'fii_dii', label: 'Treasury Flows', icon: Landmark },
    { id: 'news', label: 'Court Calendar', icon: Newspaper },
    { id: 'etf', label: 'Thematic Vaults', icon: Globe },
    { id: 'risk', label: 'Guard Protocol', icon: ShieldAlert },
  ]

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row font-sans antialiased text-[#f7f0dd]"
      style={{
        background: 'linear-gradient(165deg, #1b3a4b 0%, #243b55 45%, #2c5364 100%)',
      }}
    >
      <aside className="w-full md:w-64 shrink-0 flex flex-col border-r border-[#c9a227]/25 bg-gradient-to-b from-[#1e3a5f] to-[#152a45]">
        <div className="p-5 border-b border-[#c9a227]/25">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#e8c547] to-[#f7e7a9] text-[#1a2a1a] flex items-center justify-center text-lg shadow-md">
              🏛️
            </div>
            <div>
              <h1 className="font-serif font-black tracking-wider text-[#f7f0dd]">NOVAFORGE</h1>
              <p className="text-[10px] tracking-widest text-[#e8c547] uppercase">Palace Desk</p>
            </div>
          </div>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                currentTab === item.id
                  ? 'bg-gradient-to-r from-[#e8c547] to-[#c9a227] text-[#1a2a1a] shadow-md'
                  : 'text-[#c5d5e0] hover:bg-white/10'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-[#c9a227]/25 space-y-2">
          <button
            type="button"
            onClick={() => void onInstall()}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border border-[#c9a227]/50 text-[#e8c547] bg-[#c9a227]/10"
          >
            <Download className="w-4 h-4" /> Install App
          </button>
          {installMsg ? <p className="text-[10px] text-[#a8c0d0]">{installMsg}</p> : null}
          <button type="button" onClick={handleLogout} className="text-[11px] text-[#e8c547] hover:underline">
            Lock palace 🗝️
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 px-5 flex items-center justify-between border-b border-[#c9a227]/20 bg-[#1e3a5f]/80 backdrop-blur">
          <span className="text-xs tracking-wide text-[#e8c547] font-semibold">
            NOVAFORGE · Royal F&O Decision Court
          </span>
          <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-400/15 border border-emerald-300/40 text-emerald-200">
            ● Court in session
          </span>
        </header>
        <main className="flex-1 p-5 md:p-6 overflow-y-auto">
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
