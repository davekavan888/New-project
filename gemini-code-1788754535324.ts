import React, { useState } from 'react';
import { 
  Activity, Search, Newspaper, Globe, 
  Landmark, ShieldAlert, KeyRound, 
  User, Lock, ArrowRight
} from 'lucide-react';
import { 
  FoDecisionDesk, 
  UniversalStockScreener, 
  InstitutionalFlowsDesk, 
  VisualNewsWireDesk, 
  SectorEtfMatrix,
  RiskProtocolDesk
} from './pages/ExtraPages';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<
    'fo' | 'screener' | 'fii_dii' | 'news' | 'etf' | 'risk'
  >('fo');

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#050914] via-[#091326] to-[#040812] text-[#F8FAFC] flex items-center justify-center p-4 font-sans antialiased">
        <div className="w-full max-w-sm bg-[#0D182E] border-2 border-[#D4AF37]/50 rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"></div>

          <div className="text-center space-y-3 mb-6">
            <div className="flex justify-center items-center gap-3 text-3xl select-none">
              <span className="scale-x-[-1] inline-block filter drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">🐘</span>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#D4AF37] to-[#F7E7A9] flex items-center justify-center text-xl shadow-lg text-[#070E1C] font-bold">
                🏛️
              </div>
              <span className="filter drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">🐘</span>
            </div>

            <h1 className="text-2xl font-serif font-black tracking-widest text-[#FDFBF7]">
              NOVAFORGE
            </h1>
            <p className="text-[11px] font-mono text-[#D4AF37] uppercase tracking-wider font-bold">
              Sovereign Market Intelligence Desk
            </p>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              setIsAuthenticated(true);
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
                className="w-full bg-[#070E1C] border border-[#D4AF37]/30 rounded-xl px-3.5 py-2.5 text-[#FDFBF7] focus:outline-none focus:border-[#D4AF37] transition-all"
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
                className="w-full bg-[#070E1C] border border-[#D4AF37]/30 rounded-xl px-3.5 py-2.5 text-[#FDFBF7] focus:outline-none focus:border-[#D4AF37] transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-gradient-to-r from-[#D4AF37] to-[#B38F26] text-[#070D1E] font-bold py-2.5 rounded-xl uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <span>Unlock Gateway</span> 🗝️
            </button>
          </form>

          <div className="mt-5 pt-3 border-t border-[#D4AF37]/15 flex justify-between text-[10px] font-mono text-[#64748B]">
            <span>FEED: SMARTAPI 2.0</span>
            <span className="text-emerald-400">● GATEWAY SECURE</span>
          </div>
        </div>
      </div>
    );
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
                  Sovereign Alpha Desk
                </p>
              </div>
            </div>
          </div>

          <nav className="p-3 space-y-1.5 text-xs font-mono font-bold">
            <button
              onClick={() => setCurrentTab('fo')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                currentTab === 'fo'
                  ? 'bg-[#D4AF37] text-[#070E1C] shadow-md'
                  : 'text-[#94A3B8] hover:bg-[#16274A] hover:text-[#F8FAFC]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Activity className="w-4 h-4" />
                F&O Scalp & Trajectory
              </span>
              <span className="text-[10px] bg-[#070E1C] text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-400/40">
                LIVE
              </span>
            </button>

            <button
              onClick={() => setCurrentTab('screener')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all ${
                currentTab === 'screener'
                  ? 'bg-[#D4AF37] text-[#070E1C] shadow-md'
                  : 'text-[#94A3B8] hover:bg-[#16274A] hover:text-[#F8FAFC]'
              }`}
            >
              <Search className="w-4 h-4" />
              All-Stock Screener
            </button>

            <button
              onClick={() => setCurrentTab('fii_dii')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all ${
                currentTab === 'fii_dii'
                  ? 'bg-[#D4AF37] text-[#070E1C] shadow-md'
                  : 'text-[#94A3B8] hover:bg-[#16274A] hover:text-[#F8FAFC]'
              }`}
            >
              <Landmark className="w-4 h-4" />
              FII / DII Flow Engine
            </button>

            <button
              onClick={() => setCurrentTab('news')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all ${
                currentTab === 'news'
                  ? 'bg-[#D4AF37] text-[#070E1C] shadow-md'
                  : 'text-[#94A3B8] hover:bg-[#16274A] hover:text-[#F8FAFC]'
              }`}
            >
              <Newspaper className="w-4 h-4" />
              Live Market Wire
            </button>

            <button
              onClick={() => setCurrentTab('etf')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all ${
                currentTab === 'etf'
                  ? 'bg-[#D4AF37] text-[#070E1C] shadow-md'
                  : 'text-[#94A3B8] hover:bg-[#16274A] hover:text-[#F8FAFC]'
              }`}
            >
              <Globe className="w-4 h-4" />
              Sector & Thematic ETFs
            </button>

            <button
              onClick={() => setCurrentTab('risk')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all ${
                currentTab === 'risk'
                  ? 'bg-[#D4AF37] text-[#070E1C] shadow-md'
                  : 'text-[#94A3B8] hover:bg-[#16274A] hover:text-[#F8FAFC]'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              Capital & Risk Protocol
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-[#D4AF37]/20 bg-[#070E1C] text-[11px] font-mono text-[#64748B] flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            FEED ACTIVE
          </span>
          <span className="text-[#D4AF37]">NSE / BSE</span>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[#070E1C]">
        <header className="h-16 border-b border-[#D4AF37]/20 bg-[#0D182E] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-[#D4AF37] font-bold">NOVAFORGE</span>
            <span className="text-[#64748B]">/</span>
            <span className="text-[#F8FAFC] font-semibold">
              {currentTab === 'fo' && '⚡ Nifty, Bank Nifty & Sensex Scalp Horizon'}
              {currentTab === 'screener' && '🔍 Universal Stock Screener & Live Technical Gauges'}
              {currentTab === 'fii_dii' && '🏛️ Institutional Capital Deployments & Net Liquidity'}
              {currentTab === 'news' && '📡 Streaming Market Wire & Financial Timeline'}
              {currentTab === 'etf' && '🌐 Global Macro & Domestic Sectoral ETF Baskets'}
              {currentTab === 'risk' && '🛡️ Capital Preservation & Invalidation Rules'}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
            ● EXCHANGE TICK STREAM ACTIVE
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
  );
}