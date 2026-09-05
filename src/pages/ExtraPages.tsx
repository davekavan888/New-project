import React, { useState } from 'react'
import {
  TrendingUp,
  Search,
  Newspaper,
  Activity,
  ArrowUpRight,
  BarChart3,
  Zap,
  Landmark,
} from 'lucide-react'

// --- F&O PREDICTIVE ENGINES (5m / 10m / 15m) ---
interface IntradayProjection {
  timeframe: string
  bias: 'STRONG_BULL' | 'BULL' | 'NEUTRAL' | 'BEAR' | 'STRONG_BEAR'
  targetZone: string
  confidence: number
  driver: string
  invalidation: string
}

export const FoDecisionDesk: React.FC = () => {
  const [selectedAsset, setSelectedAsset] = useState<'NIFTY' | 'BANKNIFTY' | 'SENSEX'>('NIFTY')
  const assetMetrics = {
    NIFTY: {
      spot: '23,897.70',
      change: '+0.10%',
      pcr: '1.14',
      maxPain: '23,900',
      vwap: '23,882.40',
    },
    BANKNIFTY: {
      spot: '51,240.50',
      change: '+0.34%',
      pcr: '0.92',
      maxPain: '51,000',
      vwap: '51,180.00',
    },
    SENSEX: {
      spot: '76,515.43',
      change: '+0.46%',
      pcr: '1.05',
      maxPain: '76,500',
      vwap: '76,420.00',
    },
  }
  const projections: IntradayProjection[] = [
    {
      timeframe: '5-Minute Scalp Horizon',
      bias: 'BULL',
      targetZone: '23,920 – 23,935',
      confidence: 76,
      driver: 'Volume delta above VWAP + aggressive Call unwinding at 23,900 strike.',
      invalidation: '23,875 (Immediate Stop)',
    },
    {
      timeframe: '15-Minute Momentum Window',
      bias: 'BULL',
      targetZone: '23,960 – 23,980',
      confidence: 68,
      driver: 'RSI(14) maintaining > 58 with 9/21 EMA golden-cross on 3-min interval.',
      invalidation: '23,850',
    },
    {
      timeframe: 'End-of-Session Trajectory',
      bias: 'NEUTRAL',
      targetZone: '23,880 – 23,940 Consolidation',
      confidence: 55,
      driver: 'High Put writing at 23,800 creating a solid floor; capped by 24,000 Call OI wall.',
      invalidation: 'Break below 23,790',
    },
  ]

  const tvSymbol =
    selectedAsset === 'SENSEX'
      ? 'BSE:SENSEX'
      : selectedAsset === 'BANKNIFTY'
        ? 'NSE:BANKNIFTY'
        : 'NSE:NIFTY'

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-xs text-amber-100/90">
        <strong className="text-amber-300">Educational model:</strong> Spot / PCR / targets below are{' '}
        <strong>sample scenario cards</strong>, not guaranteed predictions. Wire Angel LIVE LTP on Decision
        Desk for real index prints. TradingView embed is third-party chart only.
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#141A28] border border-amber-500/20 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/30">
              F&amp;O SCENARIO SUITE
            </span>
            <span className="text-xs text-amber-200/80 font-mono font-semibold">MODEL READ · NOT LIVE AI</span>
          </div>
          <h2 className="text-2xl font-bold text-[#F1F5F9] font-serif">Intraday Trajectory Matrix</h2>
          <p className="text-xs text-[#94A3B8]">
            Scenario bands for learning · invalidation always shown · no guaranteed targets
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#0B0F19] p-1.5 rounded-xl border border-amber-500/20">
          {(['NIFTY', 'BANKNIFTY', 'SENSEX'] as const).map((asset) => (
            <button
              key={asset}
              type="button"
              onClick={() => setSelectedAsset(asset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                selectedAsset === asset
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              {asset}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 font-mono">
        <div className="bg-[#141A28] border border-amber-500/20 p-3.5 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">Underlying Spot</span>
          <span className="text-lg font-bold text-[#F1F5F9]">{assetMetrics[selectedAsset].spot}</span>
          <span className="text-xs text-emerald-400 block">{assetMetrics[selectedAsset].change}</span>
        </div>
        <div className="bg-[#141A28] border border-amber-500/20 p-3.5 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">VWAP (sample)</span>
          <span className="text-lg font-bold text-amber-300">{assetMetrics[selectedAsset].vwap}</span>
          <span className="text-xs text-[#94A3B8] block">Illustrative</span>
        </div>
        <div className="bg-[#141A28] border border-amber-500/20 p-3.5 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">Put/Call Ratio</span>
          <span className="text-lg font-bold text-emerald-400">{assetMetrics[selectedAsset].pcr}</span>
          <span className="text-xs text-[#94A3B8] block">Sample</span>
        </div>
        <div className="bg-[#141A28] border border-amber-500/20 p-3.5 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">Max Pain Level</span>
          <span className="text-lg font-bold text-[#F1F5F9]">{assetMetrics[selectedAsset].maxPain}</span>
          <span className="text-xs text-[#94A3B8] block">Sample</span>
        </div>
        <div className="bg-[#141A28] border border-amber-500/20 p-3.5 rounded-xl col-span-2 md:col-span-1">
          <span className="text-[10px] text-[#94A3B8] uppercase block">Scenario Stance</span>
          <span className="text-lg font-bold text-emerald-400 flex items-center gap-1">
            LONG BIAS <ArrowUpRight className="w-4 h-4" />
          </span>
          <span className="text-xs text-[#94A3B8] block">Illustrative score</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {projections.map((proj, idx) => (
          <div
            key={idx}
            className="bg-[#141A28] border border-amber-500/30 p-5 rounded-2xl space-y-4 hover:border-amber-400 transition-all"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-md">
                {proj.timeframe}
              </span>
              <span className="text-xs font-mono font-semibold text-emerald-400">
                {proj.confidence}% model weight
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[#94A3B8] font-mono uppercase block">
                Scenario target band
              </span>
              <p className="text-xl font-bold font-mono text-[#F1F5F9] mt-0.5">{proj.targetZone}</p>
            </div>
            <div className="text-xs text-[#CBD5E1] leading-relaxed border-t border-amber-500/10 pt-3">
              <strong className="text-amber-200">Read: </strong>
              {proj.driver}
            </div>
            <div className="bg-[#0B0F19] p-3 rounded-lg border border-rose-500/20 text-xs font-mono flex items-center justify-between text-rose-300">
              <span>Invalidation:</span>
              <span className="font-bold">{proj.invalidation}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#141A28] border border-amber-500/20 p-4 rounded-2xl space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-[#F1F5F9] font-serif flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-300" /> TradingView chart (embed)
          </h3>
          <span className="text-xs font-mono text-[#94A3B8]">Third-party · not Novaforge data</span>
        </div>
        <div className="w-full h-[480px] rounded-xl overflow-hidden border border-[#1E293B]">
          <iframe
            title="TradingView Chart"
            className="w-full h-full border-none"
            src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(
              tvSymbol,
            )}&interval=5&theme=dark&style=1&timezone=Asia%2FKolkata`}
          />
        </div>
      </div>
    </div>
  )
}

// --- STOCK & ETF UNIVERSAL SEARCH DESK ---
export const UniversalSearchDesk: React.FC = () => {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'ALL' | 'EQUITY' | 'COMMODITY_ETF' | 'THEMATIC'>('ALL')
  const assets = [
    {
      ticker: 'RELIANCE',
      name: 'Reliance Industries',
      type: 'EQUITY',
      price: '₹2,984.50',
      change: '+1.15%',
      signal: 'Bullish Momentum',
      pe: '28.4',
      w52h: '₹3,024',
    },
    {
      ticker: 'SILVERBEES',
      name: 'Nippon Silver ETF',
      type: 'COMMODITY_ETF',
      price: '₹88.50',
      change: '+1.85%',
      signal: 'Breakout Accumulation',
      pe: 'N/A',
      w52h: '₹94',
    },
    {
      ticker: 'TATAELXSI',
      name: 'Tata Elxsi (Semiconductor/Auto)',
      type: 'THEMATIC',
      price: '₹7,150.00',
      change: '+2.40%',
      signal: 'Reversal Formation',
      pe: '54.2',
      w52h: '₹9,200',
    },
    {
      ticker: 'GOLDBEES',
      name: 'Nippon Gold ETF',
      type: 'COMMODITY_ETF',
      price: '₹62.10',
      change: '+0.40%',
      signal: 'Hedging Safe Haven',
      pe: 'N/A',
      w52h: '₹66',
    },
    {
      ticker: 'HDFCBANK',
      name: 'HDFC Bank Ltd.',
      type: 'EQUITY',
      price: '₹1,452.10',
      change: '-0.42%',
      signal: 'Base Building',
      pe: '18.2',
      w52h: '₹1,757',
    },
    {
      ticker: 'DIXON',
      name: 'Dixon Tech (Electronics/EMS)',
      type: 'THEMATIC',
      price: '₹12,450.00',
      change: '+3.10%',
      signal: 'Institutional Expansion',
      pe: '104.2',
      w52h: '₹13,200',
    },
  ]
  const filtered = assets.filter((item) => {
    const matchesQuery =
      item.ticker.toLowerCase().includes(query.toLowerCase()) ||
      item.name.toLowerCase().includes(query.toLowerCase())
    const matchesCategory = category === 'ALL' || item.type === category
    return matchesQuery && matchesCategory
  })
  return (
    <div className="space-y-6">
      <p className="text-xs text-amber-200/80 border border-amber-500/20 rounded-xl px-3 py-2 bg-amber-500/5">
        Sample registry prices — not live quotes. Use Groww / IND Money for execution prices.
      </p>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-amber-500/20 pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#F1F5F9] font-serif">Universal Market Registry</h2>
          <p className="text-xs text-[#94A3B8]">Equities, precious metal ETFs, and thematic names</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-amber-300" />
          <input
            type="text"
            placeholder="Search stock, silver, gold, chips..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#141A28] border border-amber-500/30 rounded-xl pl-9 pr-4 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-amber-400 font-mono"
          />
        </div>
      </div>
      <div className="flex gap-2 font-mono text-xs overflow-x-auto pb-2">
        {(['ALL', 'EQUITY', 'COMMODITY_ETF', 'THEMATIC'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-lg border transition-all ${
              category === cat
                ? 'bg-amber-400 border-amber-400 text-black font-bold'
                : 'bg-[#141A28] border-amber-500/20 text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            {cat.replace('_', ' ')}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-mono">
        {filtered.map((item) => (
          <div
            key={item.ticker}
            className="bg-[#141A28] border border-amber-500/20 p-5 rounded-2xl space-y-4 hover:border-amber-400 transition-all"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded font-bold">
                  {item.type}
                </span>
                <h3 className="text-lg font-bold text-[#F1F5F9] font-sans mt-1">{item.name}</h3>
                <span className="text-xs text-[#94A3B8]">{item.ticker}.NS</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-[#F1F5F9] block">{item.price}</span>
                <span
                  className={`text-xs font-bold ${
                    item.change.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {item.change}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 bg-[#0B0F19] p-3 rounded-lg border border-[#1E293B] text-xs">
              <div>
                <span className="text-[10px] text-[#94A3B8] block">52W High</span>
                <span className="text-[#F1F5F9] font-bold">{item.w52h}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#94A3B8] block">Valuation P/E</span>
                <span className="text-amber-300 font-bold">{item.pe}</span>
              </div>
            </div>
            <div className="border-t border-amber-500/10 pt-3 flex items-center justify-between text-xs">
              <span className="text-[#94A3B8]">Scenario read:</span>
              <span className="text-emerald-400 font-bold">{item.signal}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- NEWS DESK ---
export const RealtimeNewsDesk: React.FC = () => {
  const newsStream = [
    {
      time: 'Sample',
      headline: 'RBI Stays Focused on Rupee Stability as Foreign Inflows Solidify Base',
      sector: 'MACRO / BANKING',
      impact: 'BULLISH',
      summary:
        'Central bank liquidity absorption operations remain balanced, keeping overnight interbank rates anchored.',
    },
    {
      time: 'Sample',
      headline: 'Global Silver Bullion Moves on Industrial Green Tech Demand',
      sector: 'COMMODITIES & METALS',
      impact: 'BULLISH METALS',
      summary:
        'Educational card — verify live silver/ETF prices on exchange apps before acting.',
    },
    {
      time: 'Sample',
      headline: 'Crude Softens on Demand Forecasts',
      sector: 'ENERGY & PAINTS',
      impact: 'POSITIVE FOR INDIA',
      summary:
        'Lower crude can ease import bill pressure; company margins still stock-specific.',
    },
  ]
  return (
    <div className="space-y-6">
      <div className="border-b border-amber-500/20 pb-4 flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-[#F1F5F9] font-serif">Causal Financial Wire</h2>
          <p className="text-xs text-[#94A3B8]">Sample impact cards · not a live news API</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300">
          SAMPLE FEED
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {newsStream.map((item, idx) => (
          <div
            key={idx}
            className="bg-[#141A28] border border-amber-500/20 p-5 rounded-2xl flex flex-col justify-between hover:border-amber-400 transition-all"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded font-bold">
                  {item.sector}
                </span>
                <span className="text-[#94A3B8]">{item.time}</span>
              </div>
              <h3 className="text-base font-bold text-[#F1F5F9] leading-snug font-sans">
                {item.headline}
              </h3>
              <p className="text-xs text-[#CBD5E1] leading-relaxed">{item.summary}</p>
            </div>
            <div className="pt-4 border-t border-amber-500/10 flex justify-between items-center text-xs font-mono mt-4">
              <span className="text-[#94A3B8]">Bias tag:</span>
              <span className="text-emerald-400 font-bold">{item.impact}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* Route aliases so App.tsx never breaks */
export function StockSearchPage() {
  return <UniversalSearchDesk />
}
export function StockDetailPage() {
  return <UniversalSearchDesk />
}
export function NewsIntelPage() {
  return <RealtimeNewsDesk />
}
export function GlobalMacroDesk() {
  return <FoDecisionDesk />
}
export function IpoDeskPage() {
  return (
    <div className="space-y-4 text-[#F1F5F9]">
      <h2 className="text-xl font-bold font-serif flex items-center gap-2">
        <Landmark className="w-5 h-5 text-amber-300" /> IPO Desk
      </h2>
      <p className="text-xs text-[#94A3B8]">
        GMP is unofficial. Verify on NSE / SEBI. Educational only.
      </p>
      <div className="bg-[#141A28] border border-amber-500/20 p-5 rounded-2xl text-sm">
        Use official exchange filings for applications and allotments.
      </div>
    </div>
  )
}

// --- SOVEREIGN SHELL (tabs) ---
export const ExtraPages: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'fo' | 'search' | 'news'>('fo')
  return (
    <div className="min-h-[70vh] text-[#F1F5F9] font-sans antialiased pb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center">
          <Zap className="w-5 h-5 text-black" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-wider font-serif">
            NOVAFORGE{' '}
            <span className="text-xs font-mono font-bold text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded ml-1 bg-amber-400/10">
              SOVEREIGN DESK
            </span>
          </h1>
          <p className="text-[11px] text-[#94A3B8]">Scenarios · registry · sample wire</p>
        </div>
      </div>
      <div className="flex border-b border-amber-500/20 space-x-6 text-xs font-mono font-bold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('fo')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'fo'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <Activity className="w-4 h-4" /> F&amp;O Scenario Matrix
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'search'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <Search className="w-4 h-4" /> Stock &amp; ETF Registry
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('news')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'news'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <Newspaper className="w-4 h-4" /> Market Wire
        </button>
      </div>
      <div className="pt-6">
        {activeTab === 'fo' && <FoDecisionDesk />}
        {activeTab === 'search' && <UniversalSearchDesk />}
        {activeTab === 'news' && <RealtimeNewsDesk />}
      </div>
    </div>
  )
}

export default ExtraPages
