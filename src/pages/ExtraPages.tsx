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


export const UniversalStockScreener: React.FC = () => {
  const [activeTicker, setActiveTicker] = useState<string>('RELIANCE')
  const [searchInput, setSearchInput] = useState<string>('')
  const coreUniverse = [
    { ticker: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy / Telecom' },
    { ticker: 'HDFCBANK', name: 'HDFC Bank Ltd.', sector: 'Banking' },
    { ticker: 'ICICIBANK', name: 'ICICI Bank Ltd.', sector: 'Banking' },
    { ticker: 'INFY', name: 'Infosys Technologies', sector: 'IT Services' },
    { ticker: 'TATASTEEL', name: 'Tata Steel Ltd.', sector: 'Metals' },
    { ticker: 'ZOMATO', name: 'Zomato Ltd.', sector: 'Consumer Tech' },
    { ticker: 'COCHINSHIP', name: 'Cochin Shipyard', sector: 'Defence / Ship' },
    { ticker: 'DIXON', name: 'Dixon Technologies', sector: 'Electronics / EMS' },
  ]
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = searchInput.trim().toUpperCase().replace('.NS', '').replace('NSE:', '')
    if (clean) {
      setActiveTicker(clean)
      setSearchInput('')
    }
  }
  return (
    <div className="space-y-6 font-mono">
      <p className="text-xs text-amber-200/80 border border-[#D4AF37]/25 rounded-xl px-3 py-2 bg-[#D4AF37]/5">
        Chart = TradingView embed for any NSE symbol you type. Checklist numbers are educational samples, not live quant API.
      </p>
      <div className="bg-[#111F38] border border-[#D4AF37]/30 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-[#D4AF37] px-2 py-0.5 rounded font-bold">
              NSE CHART RADAR
            </span>
            <span className="text-xs text-[#94A3B8]">Type any symbol · TV loads NSE:SYMBOL</span>
          </div>
          <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">Equity Deep-Analysis Terminal</h2>
          <p className="text-xs text-[#94A3B8]">TradingView chart + sample checklist / invalidation framework</p>
        </div>
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#D4AF37]" />
          <input
            type="text"
            placeholder="Type any symbol (e.g. SBIN, IRFC, BEL)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-[#0A1224] border border-[#D4AF37]/40 rounded-xl pl-9 pr-20 py-2.5 text-xs text-[#FDFBF7] focus:outline-none focus:border-[#D4AF37]"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 bg-[#D4AF37] text-[#070E1C] px-3 py-1 rounded-lg text-xs font-bold hover:brightness-110"
          >
            Load
          </button>
        </form>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[#94A3B8] text-[11px] shrink-0">Quick:</span>
        {coreUniverse.map((s) => (
          <button
            key={s.ticker}
            type="button"
            onClick={() => setActiveTicker(s.ticker)}
            className={`px-3 py-1.5 rounded-lg border shrink-0 transition-all ${
              activeTicker === s.ticker
                ? 'bg-[#D4AF37] text-[#070E1C] border-[#D4AF37] font-bold'
                : 'bg-[#111F38] border-[#D4AF37]/20 text-[#CBD5E1] hover:border-[#D4AF37]/50'
            }`}
          >
            {s.ticker}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#111F38] border border-[#D4AF37]/30 p-4 rounded-2xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-[#FDFBF7] flex items-center gap-2">
              CHART: {activeTicker}
            </span>
            <span className="text-[11px] text-[#D4AF37]">NSE · TradingView</span>
          </div>
          <div className="w-full h-[520px] rounded-xl overflow-hidden border border-[#1E2E4E]">
            <iframe
              key={activeTicker}
              title={`TV ${activeTicker}`}
              className="w-full h-full border-none"
              src={`https://s.tradingview.com/widgetembed/?symbol=NSE%3A${encodeURIComponent(
                activeTicker,
              )}&interval=D&theme=dark&style=1&timezone=Asia%2FKolkata`}
            />
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-[#111F38] border border-[#D4AF37]/30 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-[#FDFBF7] font-serif border-b border-[#D4AF37]/20 pb-3">
              Sample checklist: {activeTicker}
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center bg-[#0A1224] p-2.5 rounded-lg border border-[#D4AF37]/15">
                <span className="text-[#94A3B8]">Trend (sample)</span>
                <span className="text-emerald-400 font-bold">Check on chart</span>
              </div>
              <div className="flex justify-between items-center bg-[#0A1224] p-2.5 rounded-lg border border-[#D4AF37]/15">
                <span className="text-[#94A3B8]">RSI / Volume</span>
                <span className="text-[#D4AF37] font-bold">Read on TV studies</span>
              </div>
              <div className="flex justify-between items-center bg-[#0A1224] p-2.5 rounded-lg border border-[#D4AF37]/15">
                <span className="text-[#94A3B8]">Your thesis</span>
                <span className="text-[#FDFBF7] font-bold">Write before entry</span>
              </div>
            </div>
          </div>
          <div className="bg-[#111F38] border border-[#D4AF37]/30 p-5 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-emerald-400" /> Invalidation rules
            </h4>
            <div className="bg-[#0A1224] p-3 rounded-xl border border-emerald-500/20 text-xs space-y-1.5 font-sans">
              <span className="text-emerald-400 font-mono font-bold block">FRAMEWORK</span>
              <p className="text-[#CBD5E1] text-[11px] leading-relaxed">
                Define invalidation (e.g. prior swing low) before entry. Sample UI only — not a signal.
              </p>
            </div>
            <div className="bg-[#0A1224] p-3 rounded-xl border border-rose-500/30 text-xs space-y-1 font-mono">
              <div className="flex justify-between text-rose-300">
                <span>Hard stop idea:</span>
                <span className="font-bold">Your level</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Min R:R idea:</span>
                <span className="font-bold">1:2+</span>
              </div>
            </div>
          </div>
        </div>
      </div>
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
