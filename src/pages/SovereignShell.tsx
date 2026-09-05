import React, { useState } from 'react'
import { Activity, Search, Globe, Landmark, User, Lock, ArrowRight } from 'lucide-react'
import {
  FoDecisionDesk,
  UniversalStockScreener,
  SectorEtfMatrix,
  InstitutionalFlowsAndNews,
} from '@/pages/ExtraPages'

type Tab = 'fo' | 'screener' | 'etf' | 'institutional'

const GATE_KEY = 'novaforge_palace_unlocked'

export function SovereignShell() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(GATE_KEY) === '1'
    } catch {
      return true // preview-friendly if storage blocked
    }
  })
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [currentTab, setCurrentTab] = useState<Tab>('screener')

  const unlock = (e: React.FormEvent) => {
    e.preventDefault()
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
    setPassword('')
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0c1427] via-[#101d36] to-[#080d1a] text-[#F8FAFC] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#13223f] border border-[#D4AF37]/40 rounded-2xl p-7 shadow-[0_10px_40px_rgba(0,0,0,0.6)] relative">
          <div className="text-center space-y-2 mb-6">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#1a2c4e] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] text-xl shadow-md">
              🔑
            </div>
            <h1 className="text-xl font-serif font-black tracking-wider text-[#FDFBF7]">NOVAFORGE</h1>
            <p className="text-[11px] font-mono text-[#D4AF37] tracking-wider uppercase font-semibold">
              Sovereign Decision Terminal
            </p>
          </div>
          <form onSubmit={unlock} className="space-y-4 font-mono text-xs">
            <div className="space-y-1">
              <label className="text-[#94A3B8] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#D4AF37]" /> Terminal ID
              </label>
              <input
                type="text"
                placeholder="Enter Terminal ID..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#0b162c] border border-[#D4AF37]/30 rounded-lg px-3 py-2.5 text-[#FDFBF7] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[#94A3B8] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#D4AF37]" /> Access Passkey
              </label>
              <input
                type="password"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0b162c] border border-[#D4AF37]/30 rounded-lg px-3 py-2.5 text-[#FDFBF7] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <button
              type="submit"
              className="w-full mt-2 bg-gradient-to-r from-[#D4AF37] to-[#b89127] text-[#0b162c] font-bold py-2.5 rounded-lg uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <span>Authenticate</span>
              <ArrowRight className="w-4 h-4" />
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

  return (
    <div className="min-h-screen bg-[#0d172a] text-[#F8FAFC] flex flex-col md:flex-row antialiased font-sans">
      <aside className="w-full md:w-64 bg-[#111f38] border-r border-[#D4AF37]/20 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-5 border-b border-[#D4AF37]/20 bg-[#142442]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#D4AF37] to-[#f5deb3] text-[#0d172a] font-bold flex items-center justify-center text-lg shadow-md">
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
            <button
              type="button"
              onClick={() => setCurrentTab('screener')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all ${
                currentTab === 'screener'
                  ? 'bg-[#D4AF37] text-[#0d172a] shadow-md'
                  : 'text-[#94A3B8] hover:bg-[#182a4d] hover:text-[#F8FAFC]'
              }`}
            >
              <Search className="w-4 h-4" />
              All-Stock Screener
            </button>
            <button
              type="button"
              onClick={() => setCurrentTab('fo')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                currentTab === 'fo'
                  ? 'bg-[#D4AF37] text-[#0d172a] shadow-md'
                  : 'text-[#94A3B8] hover:bg-[#182a4d] hover:text-[#F8FAFC]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Activity className="w-4 h-4" />
                F&amp;O 5m/15m Scalp
              </span>
              <span className="text-[10px] bg-[#0b162c] text-[#D4AF37] px-1.5 py-0.5 rounded border border-[#D4AF37]/30">
                MODEL
              </span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentTab('etf')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all ${
                currentTab === 'etf'
                  ? 'bg-[#D4AF37] text-[#0d172a] shadow-md'
                  : 'text-[#94A3B8] hover:bg-[#182a4d] hover:text-[#F8FAFC]'
              }`}
            >
              <Globe className="w-4 h-4" />
              Sector &amp; Thematic ETFs
            </button>
            <button
              type="button"
              onClick={() => setCurrentTab('institutional')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all ${
                currentTab === 'institutional'
                  ? 'bg-[#D4AF37] text-[#0d172a] shadow-md'
                  : 'text-[#94A3B8] hover:bg-[#182a4d] hover:text-[#F8FAFC]'
              }`}
            >
              <Landmark className="w-4 h-4" />
              FII / DII &amp; Wire Desk
            </button>
          </nav>
        </div>
        <div className="p-4 border-t border-[#D4AF37]/20 bg-[#0d172a] text-[11px] font-mono text-[#64748B] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            DESK OPEN
          </span>
          <button type="button" onClick={lock} className="text-[#D4AF37] hover:underline">
            Lock
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[#0d172a]">
        <header className="h-16 border-b border-[#D4AF37]/20 bg-[#111f38] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-xs font-mono min-w-0">
            <span className="text-[#D4AF37] font-bold shrink-0">NOVAFORGE</span>
            <span className="text-[#64748B]">/</span>
            <span className="text-[#F8FAFC] font-semibold truncate">
              {currentTab === 'screener' && 'Complete Stock Registry (sample)'}
              {currentTab === 'fo' && 'Intraday Scenario Engine (educational)'}
              {currentTab === 'etf' && 'Sectoral ETF Baskets'}
              {currentTab === 'institutional' && 'FII/DII & Wire (sample)'}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-mono font-semibold">
            SOVEREIGN TERMINAL
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto bg-[#0d172a]">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'screener' && <UniversalStockScreener />}
            {currentTab === 'fo' && <FoDecisionDesk />}
            {currentTab === 'etf' && <SectorEtfMatrix />}
            {currentTab === 'institutional' && <InstitutionalFlowsAndNews />}
          </div>
        </main>
      </div>
    </div>
  )
}

export default SovereignShell
