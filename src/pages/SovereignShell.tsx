import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Search, Newspaper, Zap, LogOut } from 'lucide-react'
import ExtraPages, {
  FoDecisionDesk,
  UniversalSearchDesk,
  RealtimeNewsDesk,
} from '@/pages/ExtraPages'
import { DecisionPage } from '@/pages/DecisionPage'
import { useAuthStore } from '@/stores/auth'

type Tab = 'decision' | 'fo' | 'search' | 'news'

export function SovereignShell() {
  const [currentTab, setCurrentTab] = useState<Tab>('fo')
  const navigate = useNavigate()
  const signOut = useAuthStore((s) => s.signOut)

  return (
    <div className="min-h-screen bg-[#080B11] text-[#F8FAFC] flex flex-col md:flex-row antialiased font-sans">
      <aside className="w-full md:w-64 bg-[#0B0F19] border-r border-amber-500/20 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-5 border-b border-amber-500/20 bg-gradient-to-b from-[#141A28] to-[#0B0F19]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-200 text-black font-bold flex items-center justify-center text-xl shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                N
              </div>
              <div>
                <h1 className="font-serif font-black tracking-wider text-base text-[#F8FAFC]">NOVAFORGE</h1>
                <p className="text-[10px] font-mono tracking-widest text-amber-400 uppercase font-semibold">
                  Sovereign Alpha Desk
                </p>
              </div>
            </div>
          </div>

          <nav className="p-3 space-y-1 text-xs font-mono font-semibold">
            <button
              type="button"
              onClick={() => setCurrentTab('fo')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                currentTab === 'fo'
                  ? 'bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20'
                  : 'text-[#94A3B8] hover:bg-[#141A28] hover:text-[#F8FAFC]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Activity className="w-4 h-4" />
                F&amp;O 5m/15m Engine
              </span>
              <span className="text-[10px] bg-black/10 text-black/70 px-1.5 py-0.5 rounded">PRO</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('search')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all ${
                currentTab === 'search'
                  ? 'bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20'
                  : 'text-[#94A3B8] hover:bg-[#141A28] hover:text-[#F8FAFC]'
              }`}
            >
              <Search className="w-4 h-4" />
              Stock &amp; ETF Arsenal
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('news')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all ${
                currentTab === 'news'
                  ? 'bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20'
                  : 'text-[#94A3B8] hover:bg-[#141A28] hover:text-[#F8FAFC]'
              }`}
            >
              <Newspaper className="w-4 h-4" />
              Market Wire
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('decision')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all ${
                currentTab === 'decision'
                  ? 'bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20'
                  : 'text-[#94A3B8] hover:bg-[#141A28] hover:text-[#F8FAFC]'
              }`}
            >
              <Zap className="w-4 h-4" />
              Decision Horizon
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-amber-500/15 bg-[#080B11] text-[11px] font-mono text-[#64748B] flex items-center justify-between gap-2">
          <span>DESK: ACTIVE</span>
          <button
            type="button"
            className="text-rose-300 hover:text-rose-200 flex items-center gap-1"
            onClick={async () => {
              await signOut()
              navigate('/login')
            }}
          >
            <LogOut className="w-3.5 h-3.5" /> Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[#080B11]">
        <header className="h-16 border-b border-amber-500/20 bg-[#0B0F19] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono min-w-0">
            <span className="text-amber-400 font-bold shrink-0">NOVAFORGE</span>
            <span className="text-[#64748B]">/</span>
            <span className="text-[#F8FAFC] font-medium tracking-wide truncate">
              {currentTab === 'fo' && 'Intraday Derivatives Scenario Engine'}
              {currentTab === 'search' && 'Universal Equity & ETF Desk'}
              {currentTab === 'news' && 'Causal Financial Wire (sample)'}
              {currentTab === 'decision' && 'Risk & Invalidation Architecture'}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-mono">
              SOVEREIGN SUITE
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
              BRIDGE WHEN LIVE
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto bg-[#080B11]">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'fo' && <FoDecisionDesk />}
            {currentTab === 'search' && <UniversalSearchDesk />}
            {currentTab === 'news' && <RealtimeNewsDesk />}
            {currentTab === 'decision' && <DecisionPage />}
          </div>
        </main>
      </div>
    </div>
  )
}

export default SovereignShell
