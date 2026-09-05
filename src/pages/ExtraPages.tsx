import React, { useState, useEffect, useCallback } from 'react'
import { Search, ShieldAlert, X, RefreshCw, BarChart3 } from 'lucide-react'

const BRIDGE_URL = (import.meta as any).env?.VITE_ANGEL_BRIDGE_URL || ''

function parseBridgeLtp(data: any, underlying: 'NIFTY' | 'BANKNIFTY'): { price?: number; status?: string } {
  if (!data) return {}
  if (data.ltp && typeof data.ltp === 'object') {
    const p = data.ltp[underlying]
    if (p != null && !Number.isNaN(Number(p))) return { price: Number(p), status: data.status }
  }
  const nested = underlying === 'NIFTY' ? data.nifty ?? data.NIFTY : data.bankNifty ?? data.BANKNIFTY
  if (nested?.ltp != null) return { price: Number(nested.ltp), status: data.status }
  if (typeof nested === 'number') return { price: nested, status: data.status }
  return { status: data.status }
}

export const FoDecisionDesk: React.FC = () => {
  const [underlying, setUnderlying] = useState<'NIFTY' | 'BANKNIFTY'>('NIFTY')
  const [liveLtp, setLiveLtp] = useState(23897.7)
  const [liveChange, setLiveChange] = useState('—')
  const [isLiveConnected, setIsLiveConnected] = useState(false)
  const [lastTickTime, setLastTickTime] = useState('--:--:--')
  const [bridgeNote, setBridgeNote] = useState('')

  const fetchLiveTick = useCallback(async () => {
    if (!BRIDGE_URL) {
      setIsLiveConnected(false)
      setBridgeNote('Set VITE_ANGEL_BRIDGE_URL in Vercel env')
      return
    }
    try {
      const res = await fetch(`${BRIDGE_URL.replace(/\/$/, '')}/snapshot`, { cache: 'no-store' })
      if (!res.ok) {
        setIsLiveConnected(false)
        setBridgeNote(`HTTP ${res.status}`)
        return
      }
      const data = await res.json()
      const { price, status } = parseBridgeLtp(data, underlying)
      if (price != null && price > 0) {
        setLiveLtp(price)
        setIsLiveConnected(status === 'live' || status === 'session_ok')
        setLastTickTime(new Date().toLocaleTimeString())
        setLiveChange(status === 'live' ? 'LIVE' : String(status || 'ok'))
        setBridgeNote('')
      } else {
        setIsLiveConnected(false)
        setBridgeNote(data?.quoteError || data?.error || 'No LTP in snapshot')
      }
    } catch (e) {
      setIsLiveConnected(false)
      setBridgeNote(String(e))
    }
  }, [underlying])

  useEffect(() => {
    void fetchLiveTick()
    const timer = setInterval(() => void fetchLiveTick(), 3000)
    return () => clearInterval(timer)
  }, [fetchLiveTick])

  const vwapAnchor = underlying === 'NIFTY' ? liveLtp - 12.5 : liveLtp - 48.0
  const pcrRatio = underlying === 'NIFTY' ? '1.14' : '0.92'
  const timeProjections = [
    { horizon: 'Next 5 Minutes', low: (liveLtp + 15).toFixed(1), high: (liveLtp + 28).toFixed(1), inv: (liveLtp - 22).toFixed(1) },
    { horizon: 'Next 10 Minutes', low: (liveLtp + 25).toFixed(1), high: (liveLtp + 45).toFixed(1), inv: (liveLtp - 35).toFixed(1) },
    { horizon: 'Next 30 Minutes', low: (liveLtp + 40).toFixed(1), high: (liveLtp + 70).toFixed(1), inv: (liveLtp - 55).toFixed(1) },
    { horizon: 'Full Day Outlook', low: (liveLtp - 30).toFixed(1), high: (liveLtp + 110).toFixed(1), inv: (liveLtp - 90).toFixed(1) },
  ]

  return (
    <div className="space-y-6 font-mono">
      <div className="bg-[#111F38] border border-[#D4AF37]/30 p-5 rounded-2xl flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`w-2.5 h-2.5 rounded-full ${isLiveConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-[11px] font-bold text-[#D4AF37] uppercase">
              {isLiveConnected ? `LIVE BRIDGE (${lastTickTime})` : 'DEMO / BRIDGE OFF'}
            </span>
            {bridgeNote ? <span className="text-[10px] text-rose-300">{bridgeNote}</span> : null}
          </div>
          <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">Intraday Spot & Scenario Engine</h2>
          <p className="text-xs text-[#94A3B8]">LTP from Angel bridge when connected · bands are educational offsets</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 bg-[#0A1224] p-1.5 rounded-xl border border-[#D4AF37]/30">
            {(['NIFTY', 'BANKNIFTY'] as const).map((u) => (
              <button key={u} type="button" onClick={() => setUnderlying(u)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold ${underlying === u ? 'bg-[#D4AF37] text-[#070E1C]' : 'text-[#94A3B8]'}`}>
                {u === 'NIFTY' ? 'NIFTY 50' : 'BANK NIFTY'}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => void fetchLiveTick()} className="p-2 bg-[#0A1224] border border-[#D4AF37]/30 text-[#D4AF37] rounded-xl">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111F38] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">Spot LTP</span>
          <span className="text-2xl font-bold text-[#FDFBF7]">{liveLtp.toFixed(2)}</span>
          <span className="text-xs text-emerald-400">{liveChange}</span>
        </div>
        <div className="bg-[#111F38] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">VWAP-style anchor</span>
          <span className="text-2xl font-bold text-[#D4AF37]">{vwapAnchor.toFixed(2)}</span>
        </div>
        <div className="bg-[#111F38] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">PCR (sample)</span>
          <span className="text-2xl font-bold text-emerald-400">{pcrRatio}</span>
        </div>
        <div className="bg-[#111F38] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">Feed</span>
          <span className="text-lg font-bold text-[#D4AF37]">{isLiveConnected ? 'LIVE' : 'DEMO'}</span>
        </div>
      </div>
      <div className="bg-[#111F38] border border-[#D4AF37]/30 p-4 rounded-2xl">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold text-[#FDFBF7]">
          <BarChart3 className="w-4 h-4 text-[#D4AF37]" /> TradingView 5m
        </div>
        <div className="w-full h-[460px] rounded-xl overflow-hidden border border-[#1E2E4E]">
          <iframe title="TV" className="w-full h-full border-none"
            src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(underlying === 'BANKNIFTY' ? 'NSE:BANKNIFTY' : 'NSE:NIFTY')}&interval=5&theme=dark&style=1&timezone=Asia%2FKolkata`} />
        </div>
      </div>
      <div className="bg-[#111F38] border border-[#D4AF37]/30 rounded-2xl overflow-hidden">
        <div className="p-4 bg-[#16274A] border-b border-[#D4AF37]/20 text-xs font-bold text-[#D4AF37] uppercase">
          Scenario bands from spot (educational — not guaranteed)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A1224] text-[#94A3B8]">
              <tr>
                <th className="p-3.5">HORIZON</th>
                <th className="p-3.5">BAND</th>
                <th className="p-3.5">INVALIDATION</th>
              </tr>
            </thead>
            <tbody className="text-[#FDFBF7] divide-y divide-[#D4AF37]/10">
              {timeProjections.map((row) => (
                <tr key={row.horizon}>
                  <td className="p-3.5 text-[#D4AF37] font-bold">{row.horizon}</td>
                  <td className="p-3.5 text-emerald-400 font-bold">{row.low} – {row.high}</td>
                  <td className="p-3.5 text-rose-400 font-bold">{row.inv}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

interface StockItem {
  ticker: string; name: string; sector: string; price: string; change: string; isBull: boolean
  category: 'HIGH_ORDER_BOOK' | '52W_HIGH' | '52W_LOW' | 'SPECULATIVE'
  orderBook: string; pe: string; w52High: string; w52Low: string; thesis: string
}

export const UniversalStockScreener: React.FC = () => {
  const [filter, setFilter] = useState<'ALL' | StockItem['category']>('ALL')
  const [query, setQuery] = useState('')
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null)
  const stockArsenal: StockItem[] = [
    { ticker: 'COCHINSHIP', name: 'Cochin Shipyard', sector: 'Defence', price: '₹1,940.50', change: '+4.85%', isBull: true, category: 'HIGH_ORDER_BOOK', orderBook: '₹22,000 Cr', pe: '44.2', w52High: '₹2,100', w52Low: '₹435', thesis: 'Sample card — verify filings.' },
    { ticker: 'NHPC', name: 'NHPC Ltd.', sector: 'Power', price: '₹98.40', change: '+2.15%', isBull: true, category: 'HIGH_ORDER_BOOK', orderBook: '₹18,500 Cr', pe: '13.4', w52High: '₹118.40', w52Low: '₹48.20', thesis: 'Sample hydro narrative.' },
    { ticker: 'MAZDOCK', name: 'Mazagon Dock', sector: 'Defence', price: '₹4,450.00', change: '+3.20%', isBull: true, category: 'HIGH_ORDER_BOOK', orderBook: '₹38,500 Cr', pe: '38.6', w52High: '₹5,860', w52Low: '₹1,740', thesis: 'Sample backlog card.' },
    { ticker: 'DIXON', name: 'Dixon Technologies', sector: 'EMS', price: '₹12,450.00', change: '+3.10%', isBull: true, category: '52W_HIGH', orderBook: 'PLI', pe: '104.2', w52High: '₹13,200', w52Low: '₹4,800', thesis: 'High PE sample.' },
    { ticker: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking', price: '₹1,452.10', change: '-0.42%', isBull: false, category: '52W_LOW', orderBook: 'N/A', pe: '18.2', w52High: '₹1,757', w52Low: '₹1,363', thesis: 'Sample value zone.' },
    { ticker: 'SUZLON', name: 'Suzlon Energy', sector: 'Renewable', price: '₹74.50', change: '+5.00%', isBull: true, category: 'SPECULATIVE', orderBook: '~₹14,000 Cr', pe: '68.4', w52High: '₹86', w52Low: '₹22.50', thesis: 'High beta sample.' },
  ]
  const filtered = stockArsenal.filter((s) => {
    const c = filter === 'ALL' || s.category === filter
    const q = s.ticker.toLowerCase().includes(query.toLowerCase()) || s.name.toLowerCase().includes(query.toLowerCase())
    return c && q
  })
  return (
    <div className="space-y-6">
      <p className="text-xs text-amber-200/80 border border-[#D4AF37]/25 rounded-xl px-3 py-2 bg-[#D4AF37]/5">Sample registry · not live quotes</p>
      <div className="flex flex-col md:flex-row justify-between gap-4 border-b border-[#D4AF37]/20 pb-4">
        <h2 className="text-xl font-bold font-serif text-[#FDFBF7]">Sovereign Stock Radar</h2>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#D4AF37]" />
          <input type="text" placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#111F38] border border-[#D4AF37]/30 rounded-xl pl-9 pr-4 py-2 text-xs text-[#FDFBF7] font-mono" />
        </div>
      </div>
      <div className="flex gap-2 font-mono text-xs overflow-x-auto pb-2">
        {([['ALL', 'All'], ['HIGH_ORDER_BOOK', 'Order Book'], ['52W_HIGH', '52W High'], ['52W_LOW', '52W Low'], ['SPECULATIVE', 'Speculative']] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setFilter(id as any)}
            className={`px-3.5 py-2 rounded-xl border shrink-0 ${filter === id ? 'bg-[#D4AF37] text-[#070E1C] font-bold' : 'bg-[#111F38] border-[#D4AF37]/20 text-[#94A3B8]'}`}>{label}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-mono">
        {filtered.map((stock) => (
          <div key={stock.ticker} role="button" tabIndex={0} onClick={() => setSelectedStock(stock)}
            className="bg-[#111F38] border border-[#D4AF37]/25 p-5 rounded-2xl space-y-3 hover:border-[#D4AF37] cursor-pointer">
            <div className="flex justify-between">
              <div>
                <span className="text-[10px] text-[#D4AF37] border border-[#D4AF37]/30 px-2 py-0.5 rounded">{stock.sector}</span>
                <h3 className="text-lg font-bold text-[#FDFBF7] font-sans mt-1">{stock.name}</h3>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-[#FDFBF7] block">{stock.price}</span>
                <span className={stock.isBull ? 'text-emerald-400 text-xs' : 'text-rose-400 text-xs'}>{stock.change}</span>
              </div>
            </div>
            <p className="text-xs text-[#CBD5E1] line-clamp-2">{stock.thesis}</p>
          </div>
        ))}
      </div>
      {selectedStock && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111F38] border-2 border-[#D4AF37] w-full max-w-2xl rounded-2xl p-6 relative space-y-4">
            <button type="button" className="absolute top-4 right-4 text-[#94A3B8]" onClick={() => setSelectedStock(null)}><X className="w-5 h-5" /></button>
            <h3 className="text-2xl font-serif font-bold text-[#FDFBF7] pr-8">{selectedStock.name}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              {[['P/E', selectedStock.pe], ['52W High', selectedStock.w52High], ['52W Low', selectedStock.w52Low], ['Order book', selectedStock.orderBook]].map(([k, v]) => (
                <div key={k} className="bg-[#0A1224] p-3 rounded-xl border border-[#D4AF37]/20">
                  <span className="text-[#94A3B8] block">{k}</span>
                  <span className="text-[#D4AF37] font-bold">{v}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#CBD5E1]">{selectedStock.thesis}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export const InstitutionalFlowsDesk: React.FC = () => (
  <div className="space-y-4 font-mono">
    <p className="text-xs text-amber-200/80 border border-[#D4AF37]/25 rounded-xl px-3 py-2 bg-[#D4AF37]/5">Sample EOD-style — not auto NSE sync</p>
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">FII / DII Tracker</h2>
    <div className="overflow-x-auto border border-[#D4AF37]/30 rounded-2xl bg-[#111F38]">
      <table className="w-full text-left text-xs">
        <thead className="bg-[#0A1224] text-[#94A3B8]"><tr>
          <th className="p-3">Session</th><th className="p-3">FII Net</th><th className="p-3">DII Net</th><th className="p-3">Combined</th>
        </tr></thead>
        <tbody className="text-[#FDFBF7] divide-y divide-[#D4AF37]/10">
          <tr><td className="p-3">Recent (sample)</td><td className="p-3 text-rose-400">-₹3,111.94 Cr</td><td className="p-3 text-emerald-400">+₹8,930.12 Cr</td><td className="p-3 text-[#D4AF37]">+₹5,818 Cr</td></tr>
          <tr><td className="p-3">Prior (sample)</td><td className="p-3 text-rose-400">-₹2,345.87 Cr</td><td className="p-3 text-emerald-400">+₹4,977.46 Cr</td><td className="p-3 text-[#D4AF37]">+₹2,631 Cr</td></tr>
        </tbody>
      </table>
    </div>
  </div>
)

export const VisualNewsWireDesk: React.FC = () => (
  <div className="space-y-4">
    <p className="text-xs text-amber-200/80 border border-[#D4AF37]/25 rounded-xl px-3 py-2 bg-[#D4AF37]/5">Sample news only</p>
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">Media Wire</h2>
    <div className="grid md:grid-cols-3 gap-4">
      {['Crude / India (sample)', 'Domestic flows (sample)', 'Global rates (sample)'].map((t) => (
        <div key={t} className="bg-[#111F38] border border-[#D4AF37]/25 rounded-2xl p-5 text-xs text-[#CBD5E1]">
          <h3 className="text-[#FDFBF7] font-bold font-serif mb-2">{t}</h3>Verify on live sources.
        </div>
      ))}
    </div>
  </div>
)

export const FinancialAdvisorConsensus: React.FC = () => (
  <div className="space-y-4">
    <p className="text-xs text-amber-200/80 border border-[#D4AF37]/25 rounded-xl px-3 py-2 bg-[#D4AF37]/5">Sample targets only</p>
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">Advisor Consensus</h2>
    <div className="grid md:grid-cols-2 gap-4">
      {[['RELIANCE', '₹3,420'], ['HDFCBANK', '₹1,850'], ['TCS', '₹4,300'], ['COCHINSHIP', '₹2,280']].map(([t, tgt]) => (
        <div key={t} className="bg-[#111F38] border border-[#D4AF37]/25 rounded-2xl p-5 font-mono text-xs">
          <div className="text-[#FDFBF7] font-bold text-base font-sans">{t}</div>
          <div className="text-[#D4AF37] mt-2">Sample target: {tgt}</div>
        </div>
      ))}
    </div>
  </div>
)

export const SectorEtfMatrix: React.FC = () => (
  <div className="space-y-4 font-mono">
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">ETF Matrix</h2>
    <div className="grid md:grid-cols-2 gap-4">
      {[['SILVERBEES', 'SLV'], ['GOLDBEES', 'GLD'], ['ITBEES', 'QQQ'], ['EMS / DIXON', 'SOXX']].map(([a, b]) => (
        <div key={a} className="bg-[#111F38] border border-[#D4AF37]/25 rounded-2xl p-5 text-xs">
          <div className="text-[#FDFBF7] font-bold">{a}</div>
          <div className="text-[#D4AF37]">Global map: {b}</div>
        </div>
      ))}
    </div>
  </div>
)

export const RiskProtocolDesk: React.FC = () => (
  <div className="space-y-4">
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">Risk Protocol</h2>
    <div className="grid md:grid-cols-3 gap-4">
      {[['Max loss', 'Risk only what you can afford to lose.'], ['Invalidation', 'Define exit before entry.'], ['NO TRADE', 'Valid when feed is DEMO.']].map(([t, d]) => (
        <div key={t} className="bg-[#111F38] border border-[#D4AF37]/25 rounded-2xl p-5">
          <div className="text-[#D4AF37] font-bold text-sm mb-2 flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> {t}</div>
          <p className="text-xs text-[#CBD5E1]">{d}</p>
        </div>
      ))}
    </div>
  </div>
)

export function UniversalSearchDesk() { return <UniversalStockScreener /> }
export function RealtimeNewsDesk() { return <VisualNewsWireDesk /> }
export function StockSearchPage() { return <UniversalStockScreener /> }
export function StockDetailPage() { return <UniversalStockScreener /> }
export function NewsIntelPage() { return <VisualNewsWireDesk /> }
export function GlobalMacroDesk() { return <FoDecisionDesk /> }
export function IpoDeskPage() { return <div className="text-[#FDFBF7] text-sm">IPO · verify NSE/SEBI</div> }
export const ExtraPages: React.FC = () => <UniversalStockScreener />
export default ExtraPages
