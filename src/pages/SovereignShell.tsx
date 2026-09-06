import React, { useState } from 'react'
import {
  Activity,
  Search,
  Newspaper,
  Globe,
  Landmark,
  ShieldAlert,
  User,
  Lock,
  ArrowRight,
} from 'lucide-react'
import {
  FoDecisionDesk,
  UniversalStockScreener,
  InstitutionalFlowsDesk,
  VisualNewsWireDesk,
  SectorEtfMatrix,
  RiskProtocolDesk,
} from '@/pages/ExtraPages'

type Tab = 'fo' | 'screener' | 'fii_dii' | 'news' | 'etf' | 'risk'
const GATE_KEY = 'novaforge_unlocked'

export function SovereignShell() {
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [currentTab, setCurrentTab] = useState<Tab>('fo')

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#050914] via-[#091326] to-[#040812] text-[#F8FAFC] flex items-center justify-center p-4 font-sans antialiased">
        <div className="w-full max-w-sm bg-[#0D182E] border-2 border-[#D4AF37]/50 rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
          <div className="text-center space-y-3 mb-6">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-[#D4AF37] to-[#F7E7A9] flex items-center justify-center text-xl text-[#070E1C] font-bold">
              N
            </div>
            <h1 className="text-2xl font-serif font-black tracking-widest text-[#FDFBF7]">NOVAFORGE</h1>
            <p className="text-[11px] font-mono text-[#D4AF37] uppercase tracking-wider font-bold">
              Sovereign Market Intelligence Desk
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setIsAuthenticated(true)
            }}
            className="space-y-4 font-mono text-xs"
          >
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
              className="w-full mt-2 bg-gradient-to-r from-[#D4AF37] to-[#B38F26] text-[#070E1C] font-bold py-2.5 rounded-xl uppercase tracking-wider hover:brightness-110 flex items-center justify-center gap-2"
            >
              Unlock Gateway <ArrowRight className="w-4 h-4" />
            </button>
          </form>
          <div className="mt-5 pt-3 border-t border-[#D4AF37]/15 flex justify-between text-[10px] font-mono text-[#64748B]">
            <span>PERSONAL DESK</span>
            <span className="text-emerald-400">● SESSION GATE</span>
          </div>
        </div>
      </div>
    )
  }

  const nav: { id: Tab; label: string; icon: typeof Search; badge?: string }[] = [
    { id: 'fo', label: 'F&O Scalp & Trajectory', icon: Activity, badge: 'LTP' },
    { id: 'screener', label: 'All-Stock Screener', icon: Search },
    { id: 'fii_dii', label: 'FII / DII Flow Engine', icon: Landmark },
    { id: 'news', label: 'Live Market Wire', icon: Newspaper },
    { id: 'etf', label: 'Sector & Thematic ETFs', icon: Globe },
    { id: 'risk', label: 'Capital & Risk Protocol', icon: ShieldAlert },
  ]

  return (
    <div className="min-h-screen bg-[#070E1C] text-[#F8FAFC] flex flex-col md:flex-row antialiased font-sans">
      <aside className="w-full md:w-64 bg-[#0D182E] border-r border-[#D4AF37]/20 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-5 border-b border-[#D4AF37]/20 bg-[#12203D]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#F7E7A9] text-[#070E1C] font-bold flex items-center justify-center text-lg shadow-md">
                N
              </div>
              <div>
                <h1 className="font-serif font-black tracking-wider text-base text-[#FDFBF7]">NOVAFORGE</h1>
                <p className="text-[10px] font-mono tracking-widest text-[#D4AF37] uppercase font-bold">
                  Sovereign Alpha Desk
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
                {item.badge ? (
                  <span className="text-[10px] bg-[#070E1C] text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-400/40">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-[#D4AF37]/20 bg-[#070E1C] text-[11px] font-mono text-[#64748B] flex items-center justify-between">
          <span className="text-[#94A3B8]">DESK OPEN</span>
          <button type="button" onClick={() => setIsAuthenticated(false)} className="text-[#D4AF37] hover:underline">
            Lock
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[#070E1C]">
        <header className="h-16 border-b border-[#D4AF37]/20 bg-[#0D182E] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-xs font-mono min-w-0">
            <span className="text-[#D4AF37] font-bold shrink-0">NOVAFORGE</span>
            <span className="text-[#64748B]">/</span>
            <span className="text-[#F8FAFC] font-semibold truncate">
              {currentTab === 'fo' && 'Nifty · BankNifty · Sensex desk'}
              {currentTab === 'screener' && 'Stock chart radar'}
              {currentTab === 'fii_dii' && 'FII / DII · official NSE'}
              {currentTab === 'news' && 'Market wire'}
              {currentTab === 'etf' && 'ETF baskets'}
              {currentTab === 'risk' && 'Risk protocol'}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-mono font-semibold">
            SOVEREIGN DESK
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto bg-[#070E1C]">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'fo' && <FoDecisionDesk />}
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

export default SovereignShell
