import React, { useState, useEffect } from 'react';
import { Search, ShieldAlert, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

const BRIDGE_URL = import.meta.env.VITE_ANGEL_BRIDGE_URL || 'http://localhost:3000';

interface LiveSnapshot {
  niftyLtp?: number;
  niftyChange?: number;
  bankNiftyLtp?: number;
  bankNiftyChange?: number;
  status: 'LIVE' | 'OFFLINE' | 'DELAYED';
  timestamp: string;
}

export const RoyalHeader: React.FC<{ status: 'LIVE' | 'OFFLINE' | 'DELAYED'; onRefresh?: () => void }> = ({ status, onRefresh }) => {
  return (
    <header className="relative border-b border-[#D4AF37]/20 bg-gradient-to-r from-[#0E1424] via-[#080B11] to-[#0E1424] px-6 py-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg border border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/20 to-transparent flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.15)]">
            <Sparkles className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider font-['Cinzel'] text-[#FBF8F1] flex items-center gap-2">
              NOVAFORGE <span className="text-[11px] font-sans font-medium px-2 py-0.5 rounded-full border border-[#D4AF37]/40 text-[#D4AF37] bg-[#D4AF37]/10">COURT DESK</span>
            </h1>
            <p className="text-xs text-[#9B978F]">Sovereign Indian Market Intelligence & Execution Context</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-medium ${
            status === 'LIVE' 
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${status === 'LIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span>{status === 'LIVE' ? 'TICK FEED: LIVE (ANGEL)' : 'FEED: DEMO / DELAYED'}</span>
          </div>

          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="p-2 border border-[#D4AF37]/30 hover:border-[#D4AF37] rounded-lg bg-[#0E1424] text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
              title="Refresh bridge quotes"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export const StockSearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<string>('RELIANCE');

  const mockWatchlist = [
    { ticker: 'RELIANCE', name: 'Reliance Industries', price: '2,984.50', change: '+1.15%', pe: '28.4', w52High: '3,024.00', w52Low: '2,220.30' },
    { ticker: 'HDFCBANK', name: 'HDFC Bank Ltd.', price: '1,452.10', change: '-0.42%', pe: '18.2', w52High: '1,757.50', w52Low: '1,363.55' },
    { ticker: 'TCS', name: 'Tata Consultancy Services', price: '4,180.00', change: '+0.88%', pe: '31.1', w52High: '4,592.00', w52Low: '3,313.00' },
    { ticker: 'ICICIBANK', name: 'ICICI Bank Ltd.', price: '1,120.30', change: '+1.40%', pe: '17.8', w52High: '1,169.00', w52Low: '912.00' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#D4AF37]/20 pb-4">
        <div>
          <h2 className="text-xl font-bold font-['Cinzel'] text-[#FBF8F1]">Equity Royal Arsenal</h2>
          <p className="text-xs text-[#9B978F]">NSE Cash Quotes (Public delayed data - Yahoo .NS format)</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#D4AF37]" />
          <input 
            type="text" 
            placeholder="Search NSE equity..."
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            className="w-full bg-[#0E1424] border border-[#D4AF37]/30 rounded-lg pl-9 pr-4 py-2 text-sm text-[#FBF8F1] focus:outline-none focus:border-[#D4AF37] transition-all font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wider font-['Cinzel']">Core Heavyweights</p>
          {mockWatchlist
            .filter(item => item.ticker.includes(query) || item.name.toUpperCase().includes(query))
            .map((item) => (
              <div 
                key={item.ticker}
                onClick={() => setSelectedStock(item.ticker)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedStock === item.ticker 
                    ? 'border-[#D4AF37] bg-gradient-to-r from-[#D4AF37]/15 to-transparent shadow-[0_0_15px_rgba(212,175,55,0.1)]' 
                    : 'border-[#D4AF37]/15 bg-[#0A0E18] hover:border-[#D4AF37]/40'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono font-bold text-[#FBF8F1]">{item.ticker}</span>
                  <span className="font-mono text-sm text-[#FBF8F1]">₹{item.price}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#9B978F] truncate max-w-[150px]">{item.name}</span>
                  <span className={item.change.startsWith('+') ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>{item.change}</span>
                </div>
              </div>
            ))}
        </div>

        <div className="lg:col-span-2 border border-[#D4AF37]/30 bg-[#0A0E18] rounded-xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-[11px] font-mono border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded">NSE EQUITIES</span>
              <h3 className="text-2xl font-bold font-['Cinzel'] text-[#FBF8F1] mt-2">{selectedStock}</h3>
              <p className="text-xs text-[#9B978F]">Institutional Accumulation & Resistance Band</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold font-mono text-[#FBF8F1]">₹2,984.50</p>
              <p className="text-xs font-mono text-emerald-400">+1.15%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="p-3 border border-[#D4AF37]/20 bg-[#0E1424] rounded-lg">
              <span className="text-[10px] text-[#9B978F] uppercase">P/E Ratio</span>
              <p className="text-sm font-mono font-bold text-[#D4AF37] mt-1">28.4</p>
            </div>
            <div className="p-3 border border-[#D4AF37]/20 bg-[#0E1424] rounded-lg">
              <span className="text-[10px] text-[#9B978F] uppercase">52W High</span>
              <p className="text-sm font-mono font-bold text-[#FBF8F1] mt-1">₹3,024.00</p>
            </div>
            <div className="p-3 border border-[#D4AF37]/20 bg-[#0E1424] rounded-lg">
              <span className="text-[10px] text-[#9B978F] uppercase">52W Low</span>
              <p className="text-sm font-mono font-bold text-[#FBF8F1] mt-1">₹2,220.30</p>
            </div>
            <div className="p-3 border border-[#D4AF37]/20 bg-[#0E1424] rounded-lg">
              <span className="text-[10px] text-[#9B978F] uppercase">Posture</span>
              <p className="text-sm font-mono font-bold text-emerald-400 mt-1">ABOVE 200 EMA</p>
            </div>
          </div>

          <div className="border border-emerald-500/20 bg-emerald-500/5 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-400 font-['Cinzel'] font-bold text-sm mb-1">
              <ShieldAlert className="w-4 h-4" />
              <span>Court Scenario Engine</span>
            </div>
            <p className="text-xs text-[#CAC5BA] leading-relaxed">
              Stock hovering near resistance. Key intraday invalidation level is ₹2,915. A drop below this invalidates long momentum.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const NewsImpactPage: React.FC = () => {
  const newsTemplates = [
    {
      headline: "RBI Keeps Repo Rate Steady; Retains Inflation Vigilance",
      source: "Macro Desk / RBI",
      impact: "BULLISH BANKING",
      detail: "Positive for interest-rate sensitive Banking and NBFCs as margins remain stable.",
      time: "25m ago"
    },
    {
      headline: "Crude Oil Slumps on Weak Global Demand",
      source: "Commodities Wire",
      impact: "BULLISH AUTO & PAINTS",
      detail: "Direct input cost savings for Paint and Tire manufacturers.",
      time: "1h ago"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-[#D4AF37]/20 pb-4">
        <h2 className="text-xl font-bold font-['Cinzel'] text-[#FBF8F1]">Market Decree & News Impact</h2>
        <p className="text-xs text-[#9B978F]">Causal sector impact models</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {newsTemplates.map((item, idx) => (
          <div key={idx} className="border border-[#D4AF37]/20 bg-[#0A0E18] p-5 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-mono text-[#D4AF37] px-2 py-0.5 border border-[#D4AF37]/30 rounded bg-[#D4AF37]/5">
                  {item.source}
                </span>
                <span className="text-[10px] text-[#9B978F] font-mono">{item.time}</span>
              </div>
              <h3 className="text-sm font-semibold text-[#FBF8F1] leading-snug mb-3">{item.headline}</h3>
              <p className="text-xs text-[#CAC5BA] leading-relaxed mb-4">{item.detail}</p>
            </div>
            <div className="pt-3 border-t border-[#D4AF37]/10 flex items-center justify-between text-xs font-mono">
              <span className="text-[#9B978F]">Action Bias:</span>
              <span className="text-emerald-400 font-bold">{item.impact}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const IpoDeskPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="border-b border-[#D4AF37]/20 pb-4">
        <h2 className="text-xl font-bold font-['Cinzel'] text-[#FBF8F1]">Imperial IPO Registry</h2>
        <p className="text-xs text-[#9B978F]">NSE & BSE Primary Market Calendar</p>
      </div>

      <div className="border border-amber-500/30 bg-amber-500/10 p-4 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90 leading-relaxed">
          <strong className="text-amber-300 font-medium">Notice on Grey Market Premium (GMP):</strong> GMP is informal, unregulated, and calculated from dealer groups. Novaforge treats GMP strictly as educational context, not a guaranteed listing price.
        </div>
      </div>
    </div>
  );
};

export const ExtraPages: React.FC<{ activeTab?: 'stocks' | 'news' | 'ipo' }> = ({ activeTab = 'stocks' }) => {
  const [tab, setTab] = useState<'stocks' | 'news' | 'ipo'>(activeTab);
  const [snapshot, setSnapshot] = useState<LiveSnapshot>({
    status: 'OFFLINE',
    timestamp: new Date().toLocaleTimeString()
  });

  const checkBridge = async () => {
    try {
      const res = await fetch(`${BRIDGE_URL}/snapshot`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSnapshot({
          niftyLtp: data.nifty?.ltp,
          bankNiftyLtp: data.bankNifty?.ltp,
          status: data.status === 'live' ? 'LIVE' : 'DELAYED',
          timestamp: new Date().toLocaleTimeString()
        });
      } else {
        setSnapshot(prev => ({ ...prev, status: 'OFFLINE' }));
      }
    } catch {
      setSnapshot(prev => ({ ...prev, status: 'OFFLINE' }));
    }
  };

  useEffect(() => {
    checkBridge();
    const interval = setInterval(checkBridge, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#080B11] text-[#EAE6DF] font-sans">
      <RoyalHeader status={snapshot.status} onRefresh={checkBridge} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex border-b border-[#D4AF37]/20 mb-8 space-x-6">
          <button 
            onClick={() => setTab('stocks')}
            className={`pb-3 text-sm font-['Cinzel'] tracking-wider border-b-2 transition-all ${
              tab === 'stocks' ? 'border-[#D4AF37] text-[#D4AF37] font-bold' : 'border-transparent text-[#9B978F] hover:text-[#EAE6DF]'
            }`}
          >
            Equity Search
          </button>
          <button 
            onClick={() => setTab('news')}
            className={`pb-3 text-sm font-['Cinzel'] tracking-wider border-b-2 transition-all ${
              tab === 'news' ? 'border-[#D4AF37] text-[#D4AF37] font-bold' : 'border-transparent text-[#9B978F] hover:text-[#EAE6DF]'
            }`}
          >
            Causal News
          </button>
          <button 
            onClick={() => setTab('ipo')}
            className={`pb-3 text-sm font-['Cinzel'] tracking-wider border-b-2 transition-all ${
              tab === 'ipo' ? 'border-[#D4AF37] text-[#D4AF37] font-bold' : 'border-transparent text-[#9B978F] hover:text-[#EAE6DF]'
            }`}
          >
            IPO Registry
          </button>
        </div>

        {tab === 'stocks' && <StockSearchPage />}
        {tab === 'news' && <NewsImpactPage />}
        {tab === 'ipo' && <IpoDeskPage />}
      </main>
    </div>
  );
};

export default ExtraPages;