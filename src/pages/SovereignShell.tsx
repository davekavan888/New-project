import React, { useState } from 'react'
import {
  Activity,
  Search,
  Globe,
  Landmark,
  KeyRound,
} from 'lucide-react'
import {
  FoDecisionDesk,
  UniversalStockScreener,
  InstitutionalFlowsAndNews,
  SectorEtfMatrix,
} from '@/pages/ExtraPages'

type Tab = 'fo' | 'screener' | 'etf' | 'institutional'

const GATE_KEY = 'novaforge_palace_unlocked'

export function SovereignShell() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(GATE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [accessPasscode, setAccessPasscode] = useState('')
  const [currentTab, setCurrentTab] = useState<Tab>('fo')

  const unlock = (e: React.FormEvent) => {
    e.preventDefault()
    // Personal desk: any submit unlocks (or match optional env later)
    try {
      sessionStorage.setItem(GATE_KEY, '1')
    } catch {
      /* ignore */
    }
    setIsAuthenticated(true)
  }

  const lock = () => {
    try {
      sessionStorage.removeItem(GATE_KEY)
    } catch {
      /* ignore */
    }
    setIsAuthenticated(false)
    setAccessPasscode('')
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#060A14] via-[#0A1326] to-[#040810] text-[#F8FAFC] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0F192C] border-2 border-[#D4AF37]/50 rounded-3xl p-8 shadow-[0_0_50px_rgba(212,175,55,0.15)] relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-2 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
          <div className="text-center space-y-3 mb-8">
            <div className="flex justify-center items-center gap-4 text-3xl select-none">
              <span className="scale-x-[-1] inline-block">🐘</span>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#D4AF37] via-[#F3E5AB] to-[#AA771C] flex items-center justify-center text-2xl shadow-lg border border-[#FFE89E]/40 text-black">
                🏛
              </div>
              <span>🐘</span>
            </div>
            <h1 className="text-2xl font-serif font-black tracking-widest text-[#FDFBF7] mt-3">NOVAFORGE</h1>
            <p className="text-xs font-mono text-[#D4AF37] tracking-wider uppercase font-semibold">
              The Grand Sovereign Decision Desk
            </p>
            <p className="text-[11px] text-[#94A3B8] max-w-xs mx-auto">
              Personal market intelligence desk · educational scenarios · not investment advice
            </p>
          </div>
          <form onSubmit={unlock} className="space-y-5 font-mono">
            <div className="space-y-1.5">
              <label className="text-[11px] text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5 font-bold">
                <KeyRound className="w-3.5 h-3.5" /> Palace Access Key
              </label>
              <input
                type="password"
                placeholder="Enter access code (or press Unlock)..."
                value={accessPasscode}
                onChange={(e) => setAccessPasscode(e.target.value)}
                className="w-full bg-[#070D18] border border-[#D4AF37]/40 rounded-xl px-4 py-3 text-sm text-[#FDFBF7] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#D4AF37] via-[#E5C158] to-[#AA771C] text-black font-bold py-3 rounded-xl text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.99] transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)]"
            >
              Unlock Gateway
            </button>
          </form>
          <div className="mt-6 pt-4 border-t border-[#D4AF37]/20 flex justify-between items-center text-[10px] font-mono text-[#64748B]">
            <span>PERSONAL DESK</span>
            <span className="text-emerald-400">● SESSION GATE</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070D18] text-[#F8FAFC] flex flex-col md:flex-row antialiased font-sans">
      <aside className="w-full md:w-64 bg-[#0A1326] border-r border-[#D4AF37]/25 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-5 border-b border-[#D4AF37]/20 bg-[#0F192C]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] text-black font-bold flex items-center justify-center text-xl">
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
            {(
              [
                { id: 'fo' as const, label: 'F&O Scalp & Trajectory', icon: Activity, badge: 'MODEL' },
                { id: 'screener' as const, label: 'All-Stock Screener', icon: Search },
                { id: 'etf' as const, label: 'Sector & Thematic ETFs', icon: Globe },
                { id: 'institutional' as const, label: 'FII / DII & Wire', icon: Landmark },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                  currentTab === item.id
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#AA771C] text-black shadow-md'
                    : 'text-[#94A3B8] hover:bg-[#0F192C] hover:text-[#F8FAFC]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </span>
                {'badge' in item && item.badge ? (
                  <span className="text-[10px] bg-black/30 text-white px-1.5 py-0.5 rounded">{item.badge}</span>
                ) : null}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-[#D4AF37]/20 bg-[#070D18] text-[11px] font-mono text-[#64748B] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            DESK OPEN
          </span>
          <button type="button" onClick={lock} className="text-[#D4AF37] hover:underline">
            Lock
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[#070D18]">
        <header className="h-16 border-b border-[#D4AF37]/25 bg-[#0A1326] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-xs font-mono min-w-0">
            <span className="text-[#D4AF37] font-bold shrink-0">NOVAFORGE</span>
            <span className="text-[#64748B]">/</span>
            <span className="text-[#F8FAFC] font-semibold truncate">
              {currentTab === 'fo' && 'Intraday Scenario Engine (educational)'}
              {currentTab === 'screener' && 'Stock Registry & High-Beta Scanners (sample)'}
              {currentTab === 'etf' && 'Sectoral ETF Asset Baskets'}
              {currentTab === 'institutional' && 'FII/DII & Media Wire (sample EOD style)'}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-mono font-bold">
              SOVEREIGN TERMINAL
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto bg-[#070D18]">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'fo' && <FoDecisionDesk />}
            {currentTab === 'screener' && <UniversalStockScreener />}
            {currentTab === 'etf' && <SectorEtfMatrix />}
            {currentTab === 'institutional' && <InstitutionalFlowsAndNews />}
          </div>
        </main>
      </div>
    </div>
  )
}

export default SovereignShell
