import React, { useState } from 'react'
import {
  Search,
  ShieldAlert,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'

// =======================================================
// 1. ALL-STOCK SCREENER WITH INTERACTIVE MODAL POPUP
// =======================================================
interface StockItem {
  ticker: string
  name: string
  sector: string
  price: string
  change: string
  isBull: boolean
  category: 'HIGH_ORDER_BOOK' | '52W_HIGH' | '52W_LOW' | 'SPECULATIVE'
  orderBook: string
  annualRevenue: string
  ratio: string
  pe: string
  w52High: string
  w52Low: string
  thesis: string
}

export const UniversalStockScreener: React.FC = () => {
  const [filter, setFilter] = useState<'ALL' | 'HIGH_ORDER_BOOK' | '52W_HIGH' | '52W_LOW' | 'SPECULATIVE'>('ALL')
  const [query, setQuery] = useState('')
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null)

  const stockArsenal: StockItem[] = [
    {
      ticker: 'COCHINSHIP',
      name: 'Cochin Shipyard Ltd.',
      sector: 'Defence / Marine',
      price: '₹1,940.50',
      change: '+4.85%',
      isBull: true,
      category: 'HIGH_ORDER_BOOK',
      orderBook: '₹22,000 Cr',
      annualRevenue: '₹3,800 Cr',
      ratio: '5.8x Revenue Backlog',
      pe: '44.2',
      w52High: '₹2,100.00',
      w52Low: '₹435.00',
      thesis:
        'Order backlog exceeds annual turnover by almost 6x. Sample educational card — verify live filings.',
    },
    {
      ticker: 'NHPC',
      name: 'NHPC Ltd. (Hydro Power)',
      sector: 'Power / Utilities',
      price: '₹98.40',
      change: '+2.15%',
      isBull: true,
      category: 'HIGH_ORDER_BOOK',
      orderBook: '₹18,500 Cr (Pipeline)',
      annualRevenue: '₹9,800 Cr',
      ratio: '1.9x Revenue Capex',
      pe: '13.4',
      w52High: '₹118.40',
      w52Low: '₹48.20',
      thesis: 'Hydro build-out narrative sample. Not a buy recommendation.',
    },
    {
      ticker: 'MAZDOCK',
      name: 'Mazagon Dock Shipbuilders',
      sector: 'Defence / Submarines',
      price: '₹4,450.00',
      change: '+3.20%',
      isBull: true,
      category: 'HIGH_ORDER_BOOK',
      orderBook: '₹38,500 Cr',
      annualRevenue: '₹9,400 Cr',
      ratio: '4.1x Revenue Backlog',
      pe: '38.6',
      w52High: '₹5,860.00',
      w52Low: '₹1,740.00',
      thesis: 'Defence order-book sample narrative. Verify exchange data.',
    },
    {
      ticker: 'DIXON',
      name: 'Dixon Technologies Ltd.',
      sector: 'EMS / Electronics',
      price: '₹12,450.00',
      change: '+3.10%',
      isBull: true,
      category: '52W_HIGH',
      orderBook: 'PLI Backed Pipeline',
      annualRevenue: '₹17,600 Cr',
      ratio: 'Near 52W ATH',
      pe: '104.2',
      w52High: '₹13,200.00',
      w52Low: '₹4,800.00',
      thesis: 'Near-high sample card. High PE risk noted.',
    },
    {
      ticker: 'HDFCBANK',
      name: 'HDFC Bank Ltd.',
      sector: 'Private Banking',
      price: '₹1,452.10',
      change: '-0.42%',
      isBull: false,
      category: '52W_LOW',
      orderBook: 'N/A',
      annualRevenue: '₹1,85,000 Cr',
      ratio: 'Near 52W Low zone (sample)',
      pe: '18.2',
      w52High: '₹1,757.50',
      w52Low: '₹1,363.55',
      thesis: 'Value-zone sample narrative. Not advice.',
    },
    {
      ticker: 'SUZLON',
      name: 'Suzlon Energy Ltd.',
      sector: 'Renewable Power',
      price: '₹74.50',
      change: '+5.00%',
      isBull: true,
      category: 'SPECULATIVE',
      orderBook: '3.8 GW (~₹14,000 Cr)',
      annualRevenue: '₹6,500 Cr',
      ratio: 'High Beta Momentum',
      pe: '68.4',
      w52High: '₹86.00',
      w52Low: '₹22.50',
      thesis: 'High-beta sample. Elevated volatility.',
    },
  ]

  const filtered = stockArsenal.filter((s) => {
    const matchCat = filter === 'ALL' || s.category === filter
    const matchSearch =
      s.ticker.toLowerCase().includes(query.toLowerCase()) ||
      s.name.toLowerCase().includes(query.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="space-y-6">
      <p className="text-xs text-amber-200/80 border border-[#D4AF37]/25 rounded-xl px-3 py-2 bg-[#D4AF37]/5">
        Sample registry · prices & order books are educational templates, not live exchange ticks.
      </p>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#D4AF37]/20 pb-4">
        <div>
          <h2 className="text-xl font-bold font-serif text-[#FDFBF7]">Sovereign Stock Radar</h2>
          <p className="text-xs text-[#94A3B8]">Filter by backlog narrative, 52W extremes, or momentum</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#D4AF37]" />
          <input
            type="text"
            placeholder="Search symbol (e.g. NHPC, COCHIN)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#111F38] border border-[#D4AF37]/30 rounded-xl pl-9 pr-4 py-2 text-xs text-[#FDFBF7] focus:outline-none focus:border-[#D4AF37] font-mono"
          />
        </div>
      </div>
      <div className="flex gap-2 font-mono text-xs overflow-x-auto pb-2">
        {(
          [
            { id: 'ALL' as const, label: 'All Equities' },
            { id: 'HIGH_ORDER_BOOK' as const, label: 'High Order Book' },
            { id: '52W_HIGH' as const, label: '52W High ATH' },
            { id: '52W_LOW' as const, label: '52W Low Value' },
            { id: 'SPECULATIVE' as const, label: 'High Beta Momentum' },
          ] as const
        ).map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setFilter(cat.id)}
            className={`px-3.5 py-2 rounded-xl border transition-all shrink-0 ${
              filter === cat.id
                ? 'bg-[#D4AF37] text-[#070E1C] font-bold border-[#D4AF37]'
                : 'bg-[#111F38] border-[#D4AF37]/20 text-[#94A3B8] hover:text-[#FDFBF7]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-mono">
        {filtered.map((stock) => (
          <div
            key={stock.ticker}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedStock(stock)}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedStock(stock)}
            className="bg-[#111F38] border border-[#D4AF37]/25 p-5 rounded-2xl space-y-4 hover:border-[#D4AF37] hover:scale-[1.01] cursor-pointer transition-all shadow-md"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-2 py-0.5 rounded font-bold">
                  {stock.sector}
                </span>
                <h3 className="text-lg font-bold text-[#FDFBF7] font-sans mt-1.5">{stock.name}</h3>
                <span className="text-xs text-[#94A3B8]">NSE: {stock.ticker}</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-[#FDFBF7] block">{stock.price}</span>
                <span className={`text-xs font-bold ${stock.isBull ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {stock.change}
                </span>
              </div>
            </div>
            <div className="bg-[#0A1224] p-3 rounded-xl border border-[#D4AF37]/15 text-xs space-y-1">
              <div className="flex justify-between text-[#94A3B8]">
                <span>Order Book:</span>
                <span className="text-[#D4AF37] font-bold">{stock.orderBook}</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>Core Metric:</span>
                <span className="text-[#FDFBF7] font-bold">{stock.ratio}</span>
              </div>
            </div>
            <p className="text-xs font-sans text-[#CBD5E1] line-clamp-2 leading-relaxed border-t border-[#D4AF37]/15 pt-3">
              {stock.thesis}
            </p>
          </div>
        ))}
      </div>

      {selectedStock && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111F38] border-2 border-[#D4AF37] w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-5 font-mono relative">
            <button
              type="button"
              onClick={() => setSelectedStock(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#0A1224] text-[#94A3B8] hover:text-[#FDFBF7] border border-[#D4AF37]/20 text-xs"
            >
              Close
            </button>
            <div className="flex justify-between items-start border-b border-[#D4AF37]/20 pb-4 pr-12">
              <div>
                <span className="text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-2 py-0.5 rounded font-bold">
                  {selectedStock.sector}
                </span>
                <h3 className="text-2xl font-bold font-serif text-[#FDFBF7] mt-1">{selectedStock.name}</h3>
                <span className="text-xs text-[#94A3B8]">NSE: {selectedStock.ticker}.NS</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-[#FDFBF7] block">{selectedStock.price}</span>
                <span
                  className={`text-xs font-bold ${selectedStock.isBull ? 'text-emerald-400' : 'text-rose-400'}`}
                >
                  {selectedStock.change}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                ['P/E', selectedStock.pe],
                ['52W High', selectedStock.w52High],
                ['52W Low', selectedStock.w52Low],
                ['Order Book', selectedStock.orderBook],
              ].map(([k, v]) => (
                <div key={k} className="bg-[#0A1224] p-3 rounded-xl border border-[#D4AF37]/20">
                  <span className="text-[#94A3B8] block text-[10px]">{k}</span>
                  <span className="text-[#D4AF37] font-bold text-sm">{v}</span>
                </div>
              ))}
            </div>
            <div className="bg-[#0A1224] p-4 rounded-xl border border-emerald-500/30 text-xs font-sans space-y-2">
              <span className="font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Educational read
              </span>
              <p className="text-[#CBD5E1] leading-relaxed">{selectedStock.thesis}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==========================================
// 2. F&O MATRIX
// ==========================================
export const FoDecisionDesk: React.FC = () => {
  const [underlying, setUnderlying] = useState<'NIFTY' | 'BANKNIFTY' | 'SENSEX'>('NIFTY')
  const snapshotData = {
    NIFTY: { spot: '23,897.70', change: '+0.10%', pcr: '1.14', vwap: '23,880.50' },
    BANKNIFTY: { spot: '51,240.50', change: '+0.34%', pcr: '0.92', vwap: '51,190.00' },
    SENSEX: { spot: '76,515.43', change: '+0.46%', pcr: '1.05', vwap: '76,430.00' },
  }
  const tv =
    underlying === 'SENSEX' ? 'BSE:SENSEX' : underlying === 'BANKNIFTY' ? 'NSE:BANKNIFTY' : 'NSE:NIFTY'
  return (
    <div className="space-y-6 font-mono">
      <p className="text-xs text-amber-200/80 border border-[#D4AF37]/25 rounded-xl px-3 py-2 bg-[#D4AF37]/5">
        Sample scenario metrics · TradingView is third-party chart · not guaranteed predictions
      </p>
      <div className="bg-[#111F38] border border-[#D4AF37]/30 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">Intraday Scenario Matrix</h2>
          <p className="text-xs text-[#94A3B8]">Educational VWAP / PCR style cards</p>
        </div>
        <div className="flex items-center gap-2 bg-[#0A1224] p-1.5 rounded-xl border border-[#D4AF37]/30">
          {(['NIFTY', 'BANKNIFTY', 'SENSEX'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setUnderlying(item)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                underlying === item
                  ? 'bg-[#D4AF37] text-[#070E1C] shadow-md'
                  : 'text-[#94A3B8] hover:text-[#FDFBF7]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111F38] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] block uppercase">Spot (sample)</span>
          <span className="text-xl font-bold text-[#FDFBF7]">{snapshotData[underlying].spot}</span>
          <span className="text-xs text-emerald-400 font-semibold block">{snapshotData[underlying].change}</span>
        </div>
        <div className="bg-[#111F38] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] block uppercase">VWAP (sample)</span>
          <span className="text-xl font-bold text-[#D4AF37]">{snapshotData[underlying].vwap}</span>
        </div>
        <div className="bg-[#111F38] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] block uppercase">PCR (sample)</span>
          <span className="text-xl font-bold text-emerald-400">{snapshotData[underlying].pcr}</span>
        </div>
        <div className="bg-[#111F38] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] block uppercase">Bias tag</span>
          <span className="text-lg font-bold text-[#D4AF37] block">Illustrative</span>
        </div>
      </div>
      <div className="bg-[#111F38] border border-[#D4AF37]/30 p-4 rounded-2xl">
        <div className="w-full h-[500px] rounded-xl overflow-hidden border border-[#1E2E4E]">
          <iframe
            title="TradingView Candle View"
            className="w-full h-full border-none"
            src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tv)}&interval=5&theme=dark&style=1&timezone=Asia%2FKolkata`}
          />
        </div>
      </div>
    </div>
  )
}

// ========================================================
// 3. FII DII
// ========================================================
export const InstitutionalFlowsDesk: React.FC = () => {
  const detailedFlows = [
    {
      date: 'Recent Completed Session',
      fiiGrossBuy: '₹13,857.58 Cr',
      fiiGrossSell: '₹16,969.52 Cr',
      fiiNet: '-₹3,111.94 Cr',
      diiGrossBuy: '₹19,254.19 Cr',
      diiGrossSell: '₹10,324.07 Cr',
      diiNet: '+₹8,930.12 Cr',
      netMarketAbsorption: '+₹5,818.18 Cr',
    },
    {
      date: 'Prior Completed Session',
      fiiGrossBuy: '₹13,596.04 Cr',
      fiiGrossSell: '₹15,941.91 Cr',
      fiiNet: '-₹2,345.87 Cr',
      diiGrossBuy: '₹17,063.65 Cr',
      diiGrossSell: '₹12,086.19 Cr',
      diiNet: '+₹4,977.46 Cr',
      netMarketAbsorption: '+₹2,631.59 Cr',
    },
    {
      date: 'Prior Session -2',
      fiiGrossBuy: '₹14,210.30 Cr',
      fiiGrossSell: '₹15,102.50 Cr',
      fiiNet: '-₹892.20 Cr',
      diiGrossBuy: '₹14,980.25 Cr',
      diiGrossSell: '₹11,430.10 Cr',
      diiNet: '+₹3,550.15 Cr',
      netMarketAbsorption: '+₹2,657.95 Cr',
    },
  ]
  return (
    <div className="space-y-6 font-mono">
      <p className="text-xs text-amber-200/80 border border-[#D4AF37]/25 rounded-xl px-3 py-2 bg-[#D4AF37]/5">
        Sample EOD-style figures for UI layout · replace with official NSE provisional when wired
      </p>
      <div className="border-b border-[#D4AF37]/20 pb-4">
        <h2 className="text-xl font-bold font-serif text-[#FDFBF7]">Institutional Liquidity Tracker</h2>
        <p className="text-xs text-[#94A3B8]">Gross buy / sell / net absorption (sample table)</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111F38] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] block uppercase">FII Net (sample)</span>
          <span className="text-xl font-bold text-rose-400 block">-₹3,111.94 Cr</span>
        </div>
        <div className="bg-[#111F38] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] block uppercase">DII Net (sample)</span>
          <span className="text-xl font-bold text-emerald-400 block">+₹8,930.12 Cr</span>
        </div>
        <div className="bg-[#111F38] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] block uppercase">Combined Net (sample)</span>
          <span className="text-xl font-bold text-[#D4AF37] block">+₹5,818.18 Cr</span>
        </div>
      </div>
      <div className="bg-[#111F38] border border-[#D4AF37]/30 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#D4AF37]/15 bg-[#0A1224] text-[#94A3B8]">
              <tr>
                <th className="p-3.5">SESSION</th>
                <th className="p-3.5">FII BUY</th>
                <th className="p-3.5">FII SELL</th>
                <th className="p-3.5">FII NET</th>
                <th className="p-3.5">DII BUY</th>
                <th className="p-3.5">DII SELL</th>
                <th className="p-3.5">DII NET</th>
                <th className="p-3.5">COMBINED</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4AF37]/10 text-[#FDFBF7]">
              {detailedFlows.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#D4AF37]/5">
                  <td className="p-3.5 font-sans font-medium">{row.date}</td>
                  <td className="p-3.5 text-[#94A3B8]">{row.fiiGrossBuy}</td>
                  <td className="p-3.5 text-[#94A3B8]">{row.fiiGrossSell}</td>
                  <td className="p-3.5 text-rose-400 font-bold">{row.fiiNet}</td>
                  <td className="p-3.5 text-[#94A3B8]">{row.diiGrossBuy}</td>
                  <td className="p-3.5 text-[#94A3B8]">{row.diiGrossSell}</td>
                  <td className="p-3.5 text-emerald-400 font-bold">{row.diiNet}</td>
                  <td className="p-3.5 text-[#D4AF37] font-bold">{row.netMarketAbsorption}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ========================================================
// 4. NEWS WIRE
// ========================================================
export const VisualNewsWireDesk: React.FC = () => {
  const [filterRegion, setFilterRegion] = useState<'ALL' | 'INDIA' | 'GLOBAL'>('ALL')
  const newsItems = [
    {
      title: 'Crude softens on demand signals (sample)',
      source: 'SAMPLE DESK',
      region: 'GLOBAL' as const,
      time: 'Sample',
      impact: 'BULLISH INDIA',
      imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
      points: [
        'Educational card only — verify live commodity prices before trading.',
        'Lower crude can ease import bill pressure in some scenarios.',
        'Stock impact remains company-specific.',
      ],
    },
    {
      title: 'Domestic SIP flows narrative (sample)',
      source: 'SAMPLE DESK',
      region: 'INDIA' as const,
      time: 'Sample',
      impact: 'STRONG BULLISH',
      imageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80',
      points: [
        'Illustrative domestic flow narrative.',
        'Not official AMFI print.',
        'Use official sources for decisions.',
      ],
    },
    {
      title: 'Global rates path (sample)',
      source: 'SAMPLE DESK',
      region: 'GLOBAL' as const,
      time: 'Sample',
      impact: 'NEUTRAL',
      imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80',
      points: [
        'Sample macro card.',
        'EM risk appetite themes are illustrative.',
        'Not a forecast.',
      ],
    },
  ]
  const filteredNews = newsItems.filter((n) => filterRegion === 'ALL' || n.region === filterRegion)
  return (
    <div className="space-y-6">
      <div className="border-b border-[#D4AF37]/20 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif text-[#FDFBF7]">Multi-Source Media Wire</h2>
          <p className="text-xs text-[#94A3B8]">Sample visual cards · not a live news API</p>
        </div>
        <div className="flex gap-2 font-mono text-xs">
          {(['ALL', 'INDIA', 'GLOBAL'] as const).map((reg) => (
            <button
              key={reg}
              type="button"
              onClick={() => setFilterRegion(reg)}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                filterRegion === reg
                  ? 'bg-[#D4AF37] text-[#070E1C] font-bold border-[#D4AF37]'
                  : 'bg-[#111F38] border-[#D4AF37]/20 text-[#94A3B8]'
              }`}
            >
              {reg}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredNews.map((item, idx) => (
          <div
            key={idx}
            className="bg-[#111F38] border border-[#D4AF37]/25 rounded-2xl overflow-hidden flex flex-col hover:border-[#D4AF37] transition-all"
          >
            <div className="h-40 w-full relative overflow-hidden bg-[#0A1224]">
              <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3 bg-[#070E1C]/90 border border-[#D4AF37]/40 px-2.5 py-0.5 rounded-md text-[10px] font-mono text-[#D4AF37] font-bold">
                {item.source}
              </div>
            </div>
            <div className="p-5 space-y-3 flex-1">
              <h3 className="text-base font-bold text-[#FDFBF7] font-serif leading-snug">{item.title}</h3>
              <ul className="space-y-1.5 text-xs text-[#CBD5E1]">
                {item.points.map((pt, pIdx) => (
                  <li key={pIdx} className="flex gap-1.5">
                    <span className="text-[#D4AF37]">▪</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-4 bg-[#0A1224] border-t border-[#D4AF37]/15 flex justify-between text-xs font-mono">
              <span className="text-[#94A3B8]">{item.impact}</span>
              <span className="text-[#D4AF37] flex items-center gap-1">
                Sample <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ========================================================
// 5. ADVISOR CONSENSUS
// ========================================================
export const FinancialAdvisorConsensus: React.FC = () => {
  const recommendations = [
    {
      ticker: 'RELIANCE',
      company: 'Reliance Industries',
      agency: 'Sample Desk',
      rating: 'OVERWEIGHT',
      currentPrice: '₹2,984.50',
      targetPrice: '₹3,420.00',
      upside: '+14.6%',
      catalyst: 'Sample catalyst text only.',
    },
    {
      ticker: 'COCHINSHIP',
      company: 'Cochin Shipyard Ltd.',
      agency: 'Sample Desk',
      rating: 'BUY',
      currentPrice: '₹1,940.50',
      targetPrice: '₹2,280.00',
      upside: '+17.5%',
      catalyst: 'Sample catalyst text only.',
    },
    {
      ticker: 'HDFCBANK',
      company: 'HDFC Bank Ltd.',
      agency: 'Sample Desk',
      rating: 'BUY',
      currentPrice: '₹1,452.10',
      targetPrice: '₹1,850.00',
      upside: '+27.4%',
      catalyst: 'Sample catalyst text only.',
    },
    {
      ticker: 'TCS',
      company: 'Tata Consultancy Services',
      agency: 'Sample Desk',
      rating: 'NEUTRAL',
      currentPrice: '₹4,180.00',
      targetPrice: '₹4,300.00',
      upside: '+2.8%',
      catalyst: 'Sample catalyst text only.',
    },
  ]
  return (
    <div className="space-y-6 font-mono">
      <p className="text-xs text-amber-200/80 border border-[#D4AF37]/25 rounded-xl px-3 py-2 bg-[#D4AF37]/5">
        Sample targets only · not real broker research · verify official reports
      </p>
      <div className="border-b border-[#D4AF37]/20 pb-4">
        <h2 className="text-xl font-bold font-serif text-[#FDFBF7]">Institutional Consensus Board</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {recommendations.map((rec, idx) => (
          <div
            key={idx}
            className="bg-[#111F38] border border-[#D4AF37]/25 p-5 rounded-2xl space-y-4 hover:border-[#D4AF37] transition-all"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-2 py-0.5 rounded font-bold">
                  {rec.agency}
                </span>
                <h3 className="text-lg font-bold text-[#FDFBF7] font-sans mt-1.5">{rec.company}</h3>
                <span className="text-xs text-[#94A3B8]">{rec.ticker}.NS</span>
              </div>
              <span className="text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded font-bold">
                {rec.rating}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#0A1224] rounded-xl border border-[#D4AF37]/15 text-xs">
              <div>
                <span className="text-[#94A3B8] block text-[10px]">CURRENT (sample)</span>
                <span className="text-[#FDFBF7] font-bold">{rec.currentPrice}</span>
              </div>
              <div>
                <span className="text-[#94A3B8] block text-[10px]">TARGET (sample)</span>
                <span className="text-[#D4AF37] font-bold">{rec.targetPrice}</span>
              </div>
            </div>
            <p className="text-xs font-sans text-[#CBD5E1] border-t border-[#D4AF37]/15 pt-2">
              <strong className="text-[#D4AF37]">Note: </strong>
              {rec.catalyst}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ==========================================
// 6. ETF MATRIX
// ==========================================
export const SectorEtfMatrix: React.FC = () => {
  const etfBaskets = [
    {
      name: 'Silver Bullion ETF',
      inTicker: 'SILVERBEES.NS',
      usTicker: 'SLV / XAGUSD',
      inPrice: '₹88.50',
      usPrice: '$28.40/oz',
      change: '+1.85%',
      thesis: 'Sample macro rationale.',
    },
    {
      name: 'Gold Hedge ETF',
      inTicker: 'GOLDBEES.NS',
      usTicker: 'GLD / XAUUSD',
      inPrice: '₹62.10',
      usPrice: '$2,480/oz',
      change: '+0.40%',
      thesis: 'Sample macro rationale.',
    },
    {
      name: 'Semiconductor Hardware',
      inTicker: 'TATAELXSI / DIXON',
      usTicker: 'SOXX / NVDA',
      inPrice: '₹7,150.00',
      usPrice: '$225.10',
      change: '+2.40%',
      thesis: 'Sample macro rationale.',
    },
    {
      name: 'Nifty IT Index ETF',
      inTicker: 'ITBEES.NS',
      usTicker: 'QQQ / XLK',
      inPrice: '₹42.80',
      usPrice: '$485.00',
      change: '+0.65%',
      thesis: 'Sample macro rationale.',
    },
  ]
  return (
    <div className="space-y-6 font-mono">
      <div className="border-b border-[#D4AF37]/20 pb-4">
        <h2 className="text-xl font-bold font-serif text-[#FDFBF7]">Sector & Thematic ETF Desk</h2>
        <p className="text-xs text-[#94A3B8]">Sample India ↔ global map · not live NAVs</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {etfBaskets.map((item, i) => (
          <div
            key={i}
            className="bg-[#111F38] border border-[#D4AF37]/25 p-5 rounded-2xl space-y-4 hover:border-[#D4AF37] transition-all"
          >
            <div className="flex justify-between items-start">
              <h3 className="text-base font-bold text-[#FDFBF7] font-sans">{item.name}</h3>
              <span className="text-xs font-bold text-emerald-400">{item.change}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#0A1224] border border-[#D4AF37]/15 rounded-xl text-xs">
              <div>
                <span className="text-[#94A3B8] block text-[10px]">INDIAN</span>
                <span className="text-[#FDFBF7] font-bold block">{item.inTicker}</span>
                <span className="text-[#D4AF37]">{item.inPrice}</span>
              </div>
              <div className="border-l border-[#D4AF37]/15 pl-3">
                <span className="text-[#94A3B8] block text-[10px]">GLOBAL</span>
                <span className="text-[#FDFBF7] font-bold block">{item.usTicker}</span>
                <span className="text-[#D4AF37]">{item.usPrice}</span>
              </div>
            </div>
            <p className="text-xs font-sans text-[#CBD5E1] border-t border-[#D4AF37]/10 pt-2">
              {item.thesis}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ==========================================
// 7. RISK PROTOCOL
// ==========================================
export const RiskProtocolDesk: React.FC = () => {
  return (
    <div className="space-y-6 font-mono">
      <div className="border-b border-[#D4AF37]/20 pb-4">
        <h2 className="text-xl font-bold font-serif text-[#FDFBF7]">Capital & Risk Protocol</h2>
        <p className="text-xs text-[#94A3B8]">Personal rules checklist · educational</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#111F38] border border-[#D4AF37]/25 p-5 rounded-2xl space-y-3">
          <span className="text-xs text-[#D4AF37] font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" /> Max loss discipline
          </span>
          <p className="text-xs text-[#CBD5E1] font-sans leading-relaxed">
            Risk only capital you can afford to lose. Prefer fixed % risk per idea.
          </p>
        </div>
        <div className="bg-[#111F38] border border-[#D4AF37]/25 p-5 rounded-2xl space-y-3">
          <span className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Invalidation
          </span>
          <p className="text-xs text-[#CBD5E1] font-sans leading-relaxed">
            Every scenario needs a level where the idea is wrong — exit, do not average blindly.
          </p>
        </div>
        <div className="bg-[#111F38] border border-[#D4AF37]/25 p-5 rounded-2xl space-y-3">
          <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" /> NO TRADE is valid
          </span>
          <p className="text-xs text-[#CBD5E1] font-sans leading-relaxed">
            Standing aside when data is sample/DEMO or confidence is low is a feature.
          </p>
        </div>
      </div>
    </div>
  )
}

/** Back-compat aliases */
export function UniversalSearchDesk() {
  return <UniversalStockScreener />
}
export function RealtimeNewsDesk() {
  return <VisualNewsWireDesk />
}
export function StockSearchPage() {
  return <UniversalStockScreener />
}
export function StockDetailPage() {
  return <UniversalStockScreener />
}
export function NewsIntelPage() {
  return <VisualNewsWireDesk />
}
export function GlobalMacroDesk() {
  return <FoDecisionDesk />
}
export function IpoDeskPage() {
  return (
    <div className="text-[#FDFBF7] space-y-2">
      <h2 className="font-serif text-xl font-bold">IPO Desk</h2>
      <p className="text-xs text-[#94A3B8]">GMP unofficial · verify NSE / SEBI</p>
    </div>
  )
}

export const ExtraPages: React.FC = () => <UniversalStockScreener />
export default ExtraPages
