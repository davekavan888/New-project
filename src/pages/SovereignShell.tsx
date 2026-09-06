import React, { useState } from 'react'
import {
  Activity,
  Search,
  Newspaper,
  Globe,
  Landmark,
  UserCheck,
  ShieldAlert,
} from 'lucide-react'
import {
  UniversalStockScreener,
  FoDecisionDesk,
  InstitutionalFlowsDesk,
  VisualNewsWireDesk,
  FinancialAdvisorConsensus,
  SectorEtfMatrix,
  RiskProtocolDesk,
} from '@/pages/ExtraPages'

type Tab = 'screener' | 'fo' | 'fii_dii' | 'news' | 'advisors' | 'etf' | 'risk'

export function SovereignShell() {
  const [currentTab, setCurrentTab] = useState<Tab>('screener')

  const nav: { id: Tab; label: string; icon: typeof Search; badge?: string }[] = [
    { id: 'screener', label: 'All-Stock Screener', icon: Search },
    { id: 'fo', label: 'F&O 5m/15m Scalp', icon: Activity, badge: 'LTP' },
    { id: 'fii_dii', label: 'FII / DII Flow Engine', icon: Landmark },
    { id: 'news', label: 'Global & India News Wire', icon: Newspaper },
    { id: 'advisors', label: 'Advisor Consensus', icon: UserCheck },
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
          <span className="flex items-center gap-1.5 text-[#94A3B8]">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            DESK OPEN
          </span>
          <span className="text-[#D4AF37]">Personal use</span>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[#070E1C]">
        <header className="h-16 border-b border-[#D4AF37]/20 bg-[#0D182E] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-xs font-mono min-w-0">
            <span className="text-[#D4AF37] font-bold shrink-0">NOVAFORGE</span>
            <span className="text-[#64748B]">/</span>
            <span className="text-[#F8FAFC] font-semibold truncate">
              {currentTab === 'screener' && 'Equity screener & chart'}
              {currentTab === 'fo' && 'Nifty / Bank Nifty spot & scenarios'}
              {currentTab === 'fii_dii' && 'FII / DII flows (sample EOD style)'}
              {currentTab === 'news' && 'News wire (sample)'}
              {currentTab === 'advisors' && 'Consensus (sample)'}
              {currentTab === 'etf' && 'Sector ETFs'}
              {currentTab === 'risk' && 'Risk protocol'}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-mono font-semibold">
            SOVEREIGN DESK
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto bg-[#070E1C]">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'screener' && <UniversalStockScreener />}
            {currentTab === 'fo' && <FoDecisionDesk />}
            {currentTab === 'fii_dii' && <InstitutionalFlowsDesk />}
            {currentTab === 'news' && <VisualNewsWireDesk />}
            {currentTab === 'advisors' && <FinancialAdvisorConsensus />}
            {currentTab === 'etf' && <SectorEtfMatrix />}
            {currentTab === 'risk' && <RiskProtocolDesk />}
          </div>
        </main>
      </div>
    </div>
  )
}

export default SovereignShell
