import React, { useState } from 'react'
import {
  Search,
  TrendingUp,
  TrendingDown,
  Globe,
  ShieldAlert,
  Landmark,
} from 'lucide-react'

interface StockMetric {
  ticker: string
  name: string
  exchange: 'NSE' | 'BSE' | 'US'
  price: string
  change: string
  isPositive: boolean
  pe: string
  w52High: string
  w52Low: string
  volume: string
  verdict: string
  invalidation: string
}

export const GlobalMacroDesk: React.FC = () => {
  const [activeMarket, setActiveMarket] = useState<'ALL' | 'INDIA' | 'USA'>('ALL')
  const assets = [
    {
      name: 'Silver (Physical / ETF)',
      inTicker: 'SILVERBEES.NS',
      usTicker: 'SLV / XAGUSD',
      inPrice: '₹88.50',
      usPrice: '$28.40/oz',
      change: '+1.85%',
      isPositive: true,
      category: 'Commodity / Precious',
      thesis:
        'Industrial demand in green energy & solar panels combined with Fed rate-cut expectations.',
      indianImpact:
        'Direct boost for domestic bullion & silver metal fabricators; watch SILVERBEES volume.',
    },
    {
      name: 'Semiconductors & Tech Hardware',
      inTicker: 'TATAELXSI.NS / CGPOWER.NS',
      usTicker: 'SOXX / NVDA',
      inPrice: '₹7,150.00',
      usPrice: '$225.10',
      change: '+2.40%',
      isPositive: true,
      category: 'Thematic Tech',
      thesis: 'Global AI compute infrastructure build-out and enterprise data center expansions.',
      indianImpact:
        'Positive sentiment for Indian electronics manufacturing services (EMS) like Dixon, Kaynes, and Tata Elxsi.',
    },
    {
      name: 'Brent Crude Oil',
      inTicker: 'MCX CRUDE OIL',
      usTicker: 'BRENT / USO',
      inPrice: '₹6,150/bbl',
      usPrice: '$74.20/bbl',
      change: '-1.40%',
      isPositive: false,
      category: 'Energy / Macro',
      thesis: 'Subdued factory output from Asia offsetting OPEC+ supply curtailments.',
      indianImpact:
        'Major tailwind for Indian macros; compresses current account deficit and benefits Paint (ASIANPAINT) & OMCs.',
    },
    {
      name: 'S&P 500 / Global Benchmark',
      inTicker: 'MON100 / MASPTOP50',
      usTicker: 'SPY / VOO',
      inPrice: '₹182.20',
      usPrice: '$550.80',
      change: '+0.45%',
      isPositive: true,
      category: 'Index ETF',
      thesis: 'Resilient corporate earnings and steady US consumer spending prints.',
      indianImpact: 'Provides positive morning cues for GIFT Nifty opening gaps.',
    },
  ]

  const showIndia = activeMarket === 'ALL' || activeMarket === 'INDIA'
  const showUs = activeMarket === 'ALL' || activeMarket === 'USA'

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#D4AF37]/20 pb-4">
        <div>
          <h2 className="text-xl font-bold font-['Cinzel'] text-[#FBF8F1] flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#D4AF37]" /> Global Macro & Cross-Border Desk
          </h2>
          <p className="text-xs text-[#9B978F]">
            Monitor international commodities, semiconductor baskets, and Indian vs. US equivalents ·
            sample educational cards (not live ticks)
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#0E1424] p-1 border border-[#D4AF37]/20 rounded-lg text-xs font-mono">
          {(['ALL', 'INDIA', 'USA'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setActiveMarket(m)}
              className={`px-3 py-1 rounded transition-all ${
                activeMarket === m ? 'bg-[#D4AF37] text-black font-bold' : 'text-[#9B978F]'
              }`}
            >
              {m === 'ALL' ? 'All Macro' : m === 'INDIA' ? 'Indian Proxies' : 'US Benchmark'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {assets.map((asset, i) => (
          <div
            key={i}
            className="border border-[#D4AF37]/20 bg-[#0A0E18] p-5 rounded-xl space-y-4 hover:border-[#D4AF37]/40 transition-all"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-[#D4AF37]/30 rounded text-[#D4AF37] bg-[#D4AF37]/5">
                  {asset.category}
                </span>
                <h3 className="text-lg font-bold font-['Cinzel'] text-[#FBF8F1] mt-1.5">{asset.name}</h3>
              </div>
              <div className="text-right font-mono">
                <span
                  className={`text-sm font-bold flex items-center justify-end gap-1 ${
                    asset.isPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {asset.isPositive ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  {asset.change}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#0E1424] border border-[#D4AF37]/15 rounded-lg text-xs font-mono">
              {showIndia && (
                <div>
                  <span className="text-[#9B978F] block text-[10px]">INDIAN PROXY</span>
                  <span className="text-[#FBF8F1] font-bold block">{asset.inTicker}</span>
                  <span className="text-[#D4AF37]">{asset.inPrice}</span>
                </div>
              )}
              {showUs && (
                <div className={showIndia ? 'border-l border-[#D4AF37]/15 pl-3' : ''}>
                  <span className="text-[#9B978F] block text-[10px]">US / GLOBAL BENCHMARK</span>
                  <span className="text-[#FBF8F1] font-bold block">{asset.usTicker}</span>
                  <span className="text-[#D4AF37]">{asset.usPrice}</span>
                </div>
              )}
            </div>
            <div className="space-y-2 text-xs">
              <p className="text-[#CAC5BA] leading-relaxed">
                <strong className="text-[#D4AF37] font-serif">Global Thesis:</strong> {asset.thesis}
              </p>
              <p className="text-[#9B978F] leading-relaxed border-t border-[#D4AF37]/10 pt-2">
                <strong className="text-emerald-400 font-serif">Court Read (India):</strong>{' '}
                {asset.indianImpact}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const StockSearchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')

  const stockDatabase: StockMetric[] = [
    {
      ticker: 'RELIANCE',
      name: 'Reliance Industries Ltd.',
      exchange: 'NSE',
      price: '2,984.50',
      change: '+1.15%',
      isPositive: true,
      pe: '28.4',
      w52High: '3,024.00',
      w52Low: '2,220.30',
      volume: '6.2M',
      verdict: 'Accumulation phase near upper boundary',
      invalidation: '₹2,910',
    },
    {
      ticker: 'HDFCBANK',
      name: 'HDFC Bank Ltd.',
      exchange: 'NSE',
      price: '1,452.10',
      change: '-0.42%',
      isPositive: false,
      pe: '18.2',
      w52High: '1,757.50',
      w52Low: '1,363.55',
      volume: '14.1M',
      verdict: 'Rangebound base formation',
      invalidation: '₹1,420',
    },
    {
      ticker: 'TCS',
      name: 'Tata Consultancy Services',
      exchange: 'NSE',
      price: '4,180.00',
      change: '+0.88%',
      isPositive: true,
      pe: '31.1',
      w52High: '4,592.00',
      w52Low: '3,313.00',
      volume: '2.1M',
      verdict: 'Holding 50-day moving average',
      invalidation: '₹4,080',
    },
    {
      ticker: 'ICICIBANK',
      name: 'ICICI Bank Ltd.',
      exchange: 'NSE',
      price: '1,120.30',
      change: '+1.40%',
      isPositive: true,
      pe: '17.8',
      w52High: '1,169.00',
      w52Low: '912.00',
      volume: '8.9M',
      verdict: 'Bullish institutional participation',
      invalidation: '₹1,095',
    },
    {
      ticker: 'SILVERBEES',
      name: 'Nippon India Silver ETF',
      exchange: 'NSE',
      price: '88.50',
      change: '+1.85%',
      isPositive: true,
      pe: 'N/A',
      w52High: '94.20',
      w52Low: '67.00',
      volume: '3.4M',
      verdict: 'Breakout above consolidation channel',
      invalidation: '₹85.20',
    },
    {
      ticker: 'DIXON',
      name: 'Dixon Technologies Ltd.',
      exchange: 'NSE',
      price: '12,450.00',
      change: '+3.10%',
      isPositive: true,
      pe: '104.2',
      w52High: '13,200.00',
      w52Low: '4,800.00',
      volume: '820K',
      verdict: 'Momentum continuation supported by EMS policy',
      invalidation: '₹12,050',
    },
  ]

  const [selectedStock, setSelectedStock] = useState<StockMetric>(stockDatabase[0])
  const filtered = stockDatabase.filter(
    (s) =>
      s.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#D4AF37]/20 pb-4">
        <div>
          <h2 className="text-xl font-bold font-['Cinzel'] text-[#FBF8F1]">Sovereign Equity Registry</h2>
          <p className="text-xs text-[#9B978F]">
            NSE & BSE cash equity context · sample cache (not live quotes)
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#D4AF37]" />
          <input
            type="text"
            placeholder="Search symbol (e.g. RELIANCE, SILVERBEES)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0E1424] border border-[#D4AF37]/30 rounded-lg pl-9 pr-4 py-2 text-xs text-[#FBF8F1] focus:outline-none focus:border-[#D4AF37] font-mono"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <div
                key={item.ticker}
                onClick={() => setSelectedStock(item)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedStock.ticker === item.ticker
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                    : 'border-[#D4AF37]/15 bg-[#0A0E18] hover:border-[#D4AF37]/40'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono font-bold text-sm text-[#FBF8F1]">{item.ticker}</span>
                  <span className="font-mono text-sm text-[#FBF8F1]">₹{item.price}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#9B978F] truncate max-w-[150px]">{item.name}</span>
                  <span className={item.isPositive ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
                    {item.change}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-xs text-[#9B978F] border border-dashed border-[#D4AF37]/20 rounded-xl">
              Symbol not in local quick-cache.
            </div>
          )}
        </div>
        <div className="lg:col-span-2 border border-[#D4AF37]/30 bg-[#0A0E18] rounded-xl p-6 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded">
                {selectedStock.exchange} EQUITIES
              </span>
              <h3 className="text-2xl font-bold font-['Cinzel'] text-[#FBF8F1] mt-2">
                {selectedStock.name}
              </h3>
              <span className="font-mono text-xs text-[#9B978F]">SYMBOL: {selectedStock.ticker}.NS</span>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold font-mono text-[#FBF8F1]">₹{selectedStock.price}</p>
              <p
                className={`text-xs font-mono ${
                  selectedStock.isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {selectedStock.change}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 border border-[#D4AF37]/20 bg-[#0E1424] rounded-lg">
              <span className="text-[10px] text-[#9B978F] uppercase">P/E Ratio</span>
              <p className="text-sm font-mono font-bold text-[#D4AF37] mt-1">{selectedStock.pe}</p>
            </div>
            <div className="p-3 border border-[#D4AF37]/20 bg-[#0E1424] rounded-lg">
              <span className="text-[10px] text-[#9B978F] uppercase">52W High</span>
              <p className="text-sm font-mono font-bold text-[#FBF8F1] mt-1">₹{selectedStock.w52High}</p>
            </div>
            <div className="p-3 border border-[#D4AF37]/20 bg-[#0E1424] rounded-lg">
              <span className="text-[10px] text-[#9B978F] uppercase">52W Low</span>
              <p className="text-sm font-mono font-bold text-[#FBF8F1] mt-1">₹{selectedStock.w52Low}</p>
            </div>
            <div className="p-3 border border-[#D4AF37]/20 bg-[#0E1424] rounded-lg">
              <span className="text-[10px] text-[#9B978F] uppercase">Volume</span>
              <p className="text-sm font-mono font-bold text-[#FBF8F1] mt-1">{selectedStock.volume}</p>
            </div>
          </div>
          <div className="border border-emerald-500/20 bg-emerald-500/5 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-['Cinzel'] font-bold text-xs">
              <ShieldAlert className="w-4 h-4" />
              <span>Court Decision Scenario & Invalidation</span>
            </div>
            <p className="text-xs text-[#CAC5BA] leading-relaxed">
              <strong className="text-white">Read:</strong> {selectedStock.verdict}.
            </p>
            <p className="text-xs font-mono text-rose-300">
              <strong>Invalidation Stop:</strong> {selectedStock.invalidation}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Alias for old routes that imported StockDetailPage */
export function StockDetailPage() {
  return <StockSearchPage />
}

export const LiveNewsAndFlows: React.FC = () => {
  const fiiDiiData = [
    {
      date: 'Recent Session (Cash)',
      fiiNet: '-₹1,642 Cr',
      diiNet: '+₹2,110 Cr',
      netTotal: '+₹468 Cr',
      sentiment: 'DII SUPPORT',
    },
    {
      date: 'Month-to-Date Net',
      fiiNet: '-₹11,480 Cr',
      diiNet: '+₹18,240 Cr',
      netTotal: '+₹6,760 Cr',
      sentiment: 'DOMESTIC ABSORPTION',
    },
  ]
  const causalNews = [
    {
      title: 'US Fed Signals Measured Rate Trajectory',
      sector: 'IT & GROWTH',
      type: 'MACRO',
      impact: 'NEUTRAL TO CAUTIOUS',
      body: 'Mid-cap IT multiples face valuation ceiling; currency benefits offset pressure on revenue guidance.',
    },
    {
      title: 'Government Clears Enhanced Semiconductor Subsidy Tranche',
      sector: 'EMS & ELECTRONICS',
      type: 'POLICY',
      impact: 'STRONG BULLISH',
      body: 'Direct capital support for domestic fabrication and contract manufacturing players.',
    },
    {
      title: 'Domestic Auto Dispatches Show Rural Recovery',
      sector: 'AUTO & TRACTORS',
      type: 'EARNINGS FACTOR',
      impact: 'BULLISH',
      body: 'Two-wheeler and tractor sales exhibit volume expansion following healthy monsoon trends.',
    },
  ]
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-['Cinzel'] text-[#FBF8F1] flex items-center gap-2">
          <Landmark className="w-5 h-5 text-[#D4AF37]" /> Institutional Flows (FII / DII) & Decrees
        </h2>
        <p className="text-xs text-[#9B978F]">
          Sample EOD-style institutional prints & causal news · replace with official NSE when
          wiring live
        </p>
      </div>
      <div className="border border-[#D4AF37]/20 bg-[#0A0E18] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#D4AF37]/15 bg-[#0E1424]">
          <span className="text-xs font-['Cinzel'] font-bold text-[#D4AF37]">
            Official NSE EOD Institutional Participation (sample)
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="text-[#9B978F] border-b border-[#D4AF37]/10 bg-[#080B11]">
              <tr>
                <th className="p-3">TIMEFRAME</th>
                <th className="p-3">FII / FPI NET</th>
                <th className="p-3">DII NET</th>
                <th className="p-3">NET TOTAL</th>
                <th className="p-3">REGIME</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4AF37]/10 text-[#FBF8F1]">
              {fiiDiiData.map((row, i) => (
                <tr key={i} className="hover:bg-[#D4AF37]/5">
                  <td className="p-3 font-sans font-medium">{row.date}</td>
                  <td className="p-3 text-rose-400">{row.fiiNet}</td>
                  <td className="p-3 text-emerald-400">{row.diiNet}</td>
                  <td className="p-3 font-bold">{row.netTotal}</td>
                  <td className="p-3 text-[#D4AF37]">{row.sentiment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {causalNews.map((news, i) => (
          <div key={i} className="border border-[#D4AF37]/20 bg-[#0A0E18] p-5 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-[#D4AF37] border border-[#D4AF37]/30 px-2 py-0.5 rounded">
                {news.type}
              </span>
              <span className="text-emerald-400 font-bold">{news.impact}</span>
            </div>
            <h4 className="font-bold text-sm text-[#FBF8F1] leading-snug">{news.title}</h4>
            <p className="text-xs text-[#CAC5BA] leading-relaxed">{news.body}</p>
            <div className="pt-2 border-t border-[#D4AF37]/10 text-[11px] font-mono text-[#9B978F]">
              SECTOR FOCUS: <span className="text-[#FBF8F1]">{news.sector}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Alias for /news route */
export function NewsIntelPage() {
  return <LiveNewsAndFlows />
}

/** Minimal IPO keep so App route does not break */
export function IpoDeskPage() {
  return (
    <div className="space-y-4 text-[#EAE6DF]">
      <h2 className="text-xl font-bold font-['Cinzel'] text-[#FBF8F1]">IPO Desk</h2>
      <p className="text-xs text-[#9B978F]">
        GMP is unofficial. Verify on NSE / SEBI. Full calendar can be re-linked from earlier IPO
        module.
      </p>
      <div className="border border-[#D4AF37]/20 bg-[#0A0E18] p-5 rounded-xl text-sm">
        Use official exchange filings. Educational only.
      </div>
    </div>
  )
}

export const ExtraPages: React.FC = () => {
  const [tab, setTab] = useState<'stocks' | 'global' | 'news'>('global')
  return (
    <div className="min-h-[70vh] text-[#EAE6DF] font-sans pb-8">
      <div className="flex border-b border-[#D4AF37]/20 mb-6 space-x-6">
        <button
          type="button"
          onClick={() => setTab('global')}
          className={`pb-3 text-xs font-['Cinzel'] tracking-wider border-b-2 transition-all ${
            tab === 'global'
              ? 'border-[#D4AF37] text-[#D4AF37] font-bold'
              : 'border-transparent text-[#9B978F] hover:text-[#EAE6DF]'
          }`}
        >
          Global Macro & ETFs
        </button>
        <button
          type="button"
          onClick={() => setTab('stocks')}
          className={`pb-3 text-xs font-['Cinzel'] tracking-wider border-b-2 transition-all ${
            tab === 'stocks'
              ? 'border-[#D4AF37] text-[#D4AF37] font-bold'
              : 'border-transparent text-[#9B978F] hover:text-[#EAE6DF]'
          }`}
        >
          Equity Search
        </button>
        <button
          type="button"
          onClick={() => setTab('news')}
          className={`pb-3 text-xs font-['Cinzel'] tracking-wider border-b-2 transition-all ${
            tab === 'news'
              ? 'border-[#D4AF37] text-[#D4AF37] font-bold'
              : 'border-transparent text-[#9B978F] hover:text-[#EAE6DF]'
          }`}
        >
          FII / DII & News Decrees
        </button>
      </div>
      {tab === 'global' && <GlobalMacroDesk />}
      {tab === 'stocks' && <StockSearchPage />}
      {tab === 'news' && <LiveNewsAndFlows />}
    </div>
  )
}

export default ExtraPages
