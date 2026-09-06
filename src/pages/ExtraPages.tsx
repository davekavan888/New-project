import React, { useState, useEffect, useCallback } from 'react'
import {
  Search,
  BarChart2,
  ShieldAlert,
  Activity,
  Zap,
  RefreshCw,
} from 'lucide-react'

const BRIDGE_URL = String(
  (import.meta as any).env?.VITE_ANGEL_BRIDGE_URL || '',
).replace(/\/$/, '')

function parseLtp(data: any, underlying: string): number | null {
  if (!data) return null
  if (data.ltp && typeof data.ltp === 'object') {
    const p = data.ltp[underlying]
    if (p != null && Number(p) > 0) return Number(p)
  }
  const nested =
    underlying === 'NIFTY'
      ? data.nifty ?? data.NIFTY
      : underlying === 'BANKNIFTY'
        ? data.bankNifty ?? data.BANKNIFTY
        : data.sensex ?? data.SENSEX
  if (nested?.ltp != null && Number(nested.ltp) > 0) return Number(nested.ltp)
  if (typeof nested === 'number' && nested > 0) return nested
  return null
}

export const FoDecisionDesk: React.FC = () => {
  const [underlying, setUnderlying] = useState<'NIFTY' | 'BANKNIFTY' | 'SENSEX'>('NIFTY')
  const [liveLtp, setLiveLtp] = useState<number | null>(null)
  const [isBridgeLive, setIsBridgeLive] = useState(false)
  const [tickTimestamp, setTickTimestamp] = useState('--:--:--')
  const [err, setErr] = useState('')

  const fetchBridgeTicks = useCallback(async () => {
    if (!BRIDGE_URL) {
      setIsBridgeLive(false)
      setErr('Set VITE_ANGEL_BRIDGE_URL')
      return
    }
    try {
      const res = await fetch(`${BRIDGE_URL}/snapshot`, { cache: 'no-store' })
      if (!res.ok) {
        setIsBridgeLive(false)
        setErr('HTTP ' + res.status)
        return
      }
      const data = await res.json()
      const key = underlying === 'SENSEX' ? 'NIFTY' : underlying
      const price = parseLtp(data, key)
      if (price != null) {
        setLiveLtp(price)
        setIsBridgeLive(data.status === 'live' || price > 0)
        setTickTimestamp(
          new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
        )
        setErr(underlying === 'SENSEX' ? 'SENSEX uses NIFTY LTP proxy — chart is BSE:SENSEX' : '')
      } else {
        setIsBridgeLive(false)
        setErr(data.quoteError || data.error || 'No LTP')
      }
    } catch (e) {
      setIsBridgeLive(false)
      setErr(String(e))
    }
  }, [underlying])

  useEffect(() => {
    void fetchBridgeTicks()
    const id = setInterval(() => void fetchBridgeTicks(), 3000)
    return () => clearInterval(id)
  }, [fetchBridgeTicks])

  const spot = liveLtp ?? 0
  const off =
    underlying === 'SENSEX' ? 65 : underlying === 'BANKNIFTY' ? 52 : 14.5
  const vwapAnchor = spot > 0 ? spot - off : 0

  const timeProjections =
    spot > 0
      ? [
          {
            horizon: 'Next 5 Minutes',
            targetBand: `${(spot + 15).toFixed(1)} – ${(spot + 28).toFixed(1)}`,
            bias: 'SCENARIO',
            note: 'Example band above spot — not a trade signal',
            invalidation: (spot - 22).toFixed(1),
          },
          {
            horizon: 'Next 10 Minutes',
            targetBand: `${(spot + 25).toFixed(1)} – ${(spot + 45).toFixed(1)}`,
            bias: 'SCENARIO',
            note: 'Wider structure only',
            invalidation: (spot - 35).toFixed(1),
          },
          {
            horizon: 'Next 30 Minutes',
            targetBand: `${(spot + 40).toFixed(1)} – ${(spot + 70).toFixed(1)}`,
            bias: 'SCENARIO',
            note: 'Planning range — confirm on chart',
            invalidation: (spot - 55).toFixed(1),
          },
          {
            horizon: 'Session envelope',
            targetBand: `${(spot - 30).toFixed(1)} – ${(spot + 110).toFixed(1)}`,
            bias: 'RANGE',
            note: 'Rough session idea for stops',
            invalidation: (spot - 90).toFixed(1),
          },
        ]
      : []

  const tvSymbol =
    underlying === 'SENSEX' ? 'BSE:SENSEX' : `NSE:${underlying}`

  return (
    <div className="space-y-6 font-mono">
      <div className="bg-[#0D182E] border border-[#D4AF37]/30 p-5 rounded-2xl flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isBridgeLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-[11px] font-bold text-[#D4AF37] uppercase">
              {isBridgeLive
                ? `ANGEL LTP LIVE (${tickTimestamp} IST)`
                : 'BRIDGE WAITING'}
            </span>
            {err ? <span className="text-[10px] text-amber-200/80">{err}</span> : null}
          </div>
          <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">
            Intraday Index Desk
          </h2>
          <p className="text-xs text-[#94A3B8]">
            Real LTP from Angel · chart TradingView · table = scenario bands only
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 bg-[#070E1C] p-1.5 rounded-xl border border-[#D4AF37]/30">
            {(['NIFTY', 'BANKNIFTY', 'SENSEX'] as const).map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => setUnderlying(sym)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold ${
                  underlying === sym
                    ? 'bg-[#D4AF37] text-[#070E1C]'
                    : 'text-[#94A3B8]'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void fetchBridgeTicks()}
            className="p-2 border border-[#D4AF37]/30 rounded-xl text-[#D4AF37]"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">Live Spot LTP</span>
          <span className="text-2xl font-bold text-[#FDFBF7]">
            {liveLtp != null
              ? liveLtp.toLocaleString('en-IN', { maximumFractionDigits: 2 })
              : '—'}
          </span>
          <span
            className={`text-xs font-semibold ${
              isBridgeLive ? 'text-emerald-400' : 'text-amber-300'
            }`}
          >
            {isBridgeLive ? 'LIVE' : 'WAITING'}
          </span>
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">Offset ref</span>
          <span className="text-2xl font-bold text-[#D4AF37]">
            {vwapAnchor > 0 ? vwapAnchor.toFixed(2) : '—'}
          </span>
          <span className="text-xs text-[#94A3B8]">not exchange VWAP</span>
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">Source</span>
          <span className="text-sm font-bold text-[#D4AF37]">Angel SmartAPI</span>
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">Rule</span>
          <span className="text-xs text-[#CBD5E1]">Confirm on broker before order</span>
        </div>
      </div>

      <div className="bg-[#0D182E] border border-[#D4AF37]/30 p-4 rounded-2xl">
        <div className="flex justify-between mb-3 text-xs">
          <span className="font-bold text-[#FDFBF7] flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#D4AF37]" /> {tvSymbol}
          </span>
          <span className="text-[#94A3B8]">5m</span>
        </div>
        <div className="w-full h-[520px] rounded-xl overflow-hidden border border-[#1E2E4E] bg-black">
          <iframe
            key={`chart-${underlying}`}
            title={tvSymbol}
            className="w-full h-full border-none"
            src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(
              tvSymbol,
            )}&interval=5&theme=dark&style=1&timezone=Asia%2FKolkata`}
          />
        </div>
      </div>

      <div className="bg-[#0D182E] border border-[#D4AF37]/30 rounded-2xl overflow-hidden">
        <div className="p-4 bg-[#12203D] border-b border-[#D4AF37]/20 text-xs font-bold text-[#D4AF37] uppercase">
          Scenario bands from LTP (not predictions / not 78% signals)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070E1C] text-[#94A3B8] border-b border-[#D4AF37]/15">
              <tr>
                <th className="p-3.5">HORIZON</th>
                <th className="p-3.5">BAND</th>
                <th className="p-3.5">LABEL</th>
                <th className="p-3.5">NOTE</th>
                <th className="p-3.5">EXAMPLE CUT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4AF37]/10 text-[#FDFBF7]">
              {timeProjections.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-[#94A3B8]">
                    Waiting for Angel LTP…
                  </td>
                </tr>
              ) : (
                timeProjections.map((row, i) => (
                  <tr key={i} className="hover:bg-[#D4AF37]/5">
                    <td className="p-3.5 font-bold text-[#D4AF37]">{row.horizon}</td>
                    <td className="p-3.5 text-emerald-400 font-bold font-mono">
                      {row.targetBand}
                    </td>
                    <td className="p-3.5">{row.bias}</td>
                    <td className="p-3.5 text-[#CBD5E1]">{row.note}</td>
                    <td className="p-3.5 text-rose-400 font-bold">{row.invalidation}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export const UniversalStockScreener: React.FC = () => {
  const [activeSymbol, setActiveSymbol] = useState('RELIANCE')
  const [inputVal, setInputVal] = useState('')
  const heavyweights = [
    'RELIANCE',
    'HDFCBANK',
    'ICICIBANK',
    'INFY',
    'TATASTEEL',
    'SBIN',
    'DIXON',
    'IRFC',
  ]
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = inputVal
      .trim()
      .toUpperCase()
      .replace(/\.NS$/i, '')
      .replace(/^NSE:/i, '')
    if (clean) {
      setActiveSymbol(clean)
      setInputVal('')
    }
  }
  const nse = `NSE:${activeSymbol}`
  return (
    <div className="space-y-6 font-mono">
      <div className="bg-[#0D182E] border border-[#D4AF37]/30 p-5 rounded-2xl flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">Stock Chart Desk</h2>
          <p className="text-xs text-[#94A3B8]">TradingView {nse}</p>
        </div>
        <form onSubmit={handleSearch} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#D4AF37]" />
          <input
            type="text"
            placeholder="Symbol e.g. SBIN"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="w-full bg-[#070E1C] border border-[#D4AF37]/40 rounded-xl pl-9 pr-20 py-2.5 text-xs text-[#FDFBF7] focus:outline-none focus:border-[#D4AF37]"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 bg-[#D4AF37] text-[#070E1C] px-3.5 py-1 rounded-lg text-xs font-bold"
          >
            Load
          </button>
        </form>
      </div>
      <div className="flex gap-2 overflow-x-auto text-xs">
        {heavyweights.map((sym) => (
          <button
            key={sym}
            type="button"
            onClick={() => setActiveSymbol(sym)}
            className={`px-3 py-1.5 rounded-lg border shrink-0 ${
              activeSymbol === sym
                ? 'bg-[#D4AF37] text-[#070E1C] border-[#D4AF37] font-bold'
                : 'bg-[#0D182E] border-[#D4AF37]/20 text-[#CBD5E1]'
            }`}
          >
            {sym}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0D182E] border border-[#D4AF37]/30 p-4 rounded-2xl">
          <div className="w-full h-[520px] rounded-xl overflow-hidden bg-black border border-[#1E2E4E]">
            <iframe
              key={`chart-${activeSymbol}`}
              title={nse}
              className="w-full h-full border-none"
              src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(
                nse,
              )}&interval=D&theme=dark&style=1&timezone=Asia%2FKolkata`}
            />
          </div>
        </div>
        <div className="bg-[#0D182E] border border-rose-500/30 p-4 rounded-2xl text-xs">
          <span className="text-rose-400 font-bold flex items-center gap-1.5 mb-2">
            <ShieldAlert className="w-4 h-4" /> Risk
          </span>
          <p className="text-[#CBD5E1]">
            Confirm {activeSymbol} price on broker before any order.
          </p>
        </div>
      </div>
    </div>
  )
}

export const InstitutionalFlowsDesk: React.FC = () => (
  <div className="space-y-4 font-mono">
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">FII / DII</h2>
    <p className="text-xs text-[#94A3B8]">
      Official EOD:{' '}
      <a
        className="text-[#D4AF37] underline"
        href="https://www.nseindia.com/reports/fii-dii"
        target="_blank"
        rel="noreferrer"
      >
        NSE FII/DII report
      </a>
    </p>
  </div>
)

export const VisualNewsWireDesk: React.FC = () => (
  <div className="space-y-4 font-mono">
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">Market wire</h2>
    <div className="w-full h-[620px] rounded-2xl overflow-hidden border border-[#D4AF37]/30 bg-black">
      <iframe
        title="news"
        className="w-full h-full border-none"
        src="https://s.tradingview.com/embed-widget/timeline/?locale=en#%7B%22feedMode%22%3A%22all_symbols%22%2C%22isTransparent%22%3Atrue%2C%22displayMode%22%3A%22regular%22%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22colorTheme%22%3A%22dark%22%7D"
      />
    </div>
  </div>
)

export const SectorEtfMatrix: React.FC = () => (
  <div className="space-y-4 font-mono">
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">ETF charts</h2>
    <div className="grid md:grid-cols-2 gap-3">
      {['NSE:SILVERBEES', 'NSE:GOLDBEES', 'NSE:ITBEES', 'NSE:BANKBEES'].map((sym) => (
        <div key={sym} className="bg-[#0D182E] border border-[#D4AF37]/25 p-3 rounded-xl">
          <div className="text-xs font-bold text-[#FDFBF7] mb-2">{sym}</div>
          <div className="h-[200px] bg-black rounded-lg overflow-hidden">
            <iframe
              title={sym}
              className="w-full h-full border-none"
              src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(
                sym,
              )}&interval=D&theme=dark&style=1&timezone=Asia%2FKolkata`}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
)

export const RiskProtocolDesk: React.FC = () => (
  <div className="space-y-4 font-mono">
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">Risk protocol</h2>
    <div className="grid md:grid-cols-3 gap-4 text-xs text-[#CBD5E1]">
      <div className="bg-[#0D182E] border border-[#D4AF37]/25 p-5 rounded-2xl">
        <ShieldAlert className="w-4 h-4 text-[#D4AF37] mb-2" />
        Risk small fixed % of capital per idea.
      </div>
      <div className="bg-[#0D182E] border border-[#D4AF37]/25 p-5 rounded-2xl">
        <Activity className="w-4 h-4 text-amber-300 mb-2" />
        Pre-define invalidation before entry.
      </div>
      <div className="bg-[#0D182E] border border-[#D4AF37]/25 p-5 rounded-2xl">
        <Zap className="w-4 h-4 text-emerald-400 mb-2" />
        Confirm LTP on broker app always.
      </div>
    </div>
  </div>
)

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
  return <div className="text-sm text-[#FDFBF7]">IPO — NSE / SEBI</div>
}
export function FinancialAdvisorConsensus() {
  return (
    <div className="text-sm text-[#CBD5E1]">Use broker research — no fake targets.</div>
  )
}

export const ExtraPages: React.FC = () => <FoDecisionDesk />
export default ExtraPages
