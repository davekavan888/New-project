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

function tvChart(symbol: string, interval: string) {
  return `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(
    symbol,
  )}&interval=${interval}&theme=dark&style=1&timezone=Asia%2FKolkata&hideideas=1`
}

function tvTech(symbol: string, interval: string) {
  const payload = {
    interval,
    width: '100%',
    isTransparent: true,
    height: '100%',
    symbol,
    showIntervalTabs: true,
    displayMode: 'single',
    colorTheme: 'dark',
    locale: 'en',
  }
  return `https://s.tradingview.com/embed-widget/technical-analysis/?locale=en#${encodeURIComponent(
    JSON.stringify(payload),
  )}`
}

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

// =========================================================================
// 1. F&O — Angel LTP + chart + scenario bands (not guaranteed signals)
// =========================================================================
export const FoDecisionDesk: React.FC = () => {
  const [underlying, setUnderlying] = useState<'NIFTY' | 'BANKNIFTY' | 'SENSEX'>('NIFTY')
  const [liveLtp, setLiveLtp] = useState<number | null>(null)
  const [isBridgeLive, setIsBridgeLive] = useState(false)
  const [tickTimestamp, setTickTimestamp] = useState('--:--:--')
  const [status, setStatus] = useState('starting')
  const [err, setErr] = useState('')

  const fetchBridgeTicks = useCallback(async () => {
    if (!BRIDGE_URL) {
      setIsBridgeLive(false)
      setStatus('no_bridge')
      setErr('Set VITE_ANGEL_BRIDGE_URL on Vercel')
      return
    }
    try {
      const res = await fetch(`${BRIDGE_URL}/snapshot`, { cache: 'no-store' })
      if (!res.ok) {
        setIsBridgeLive(false)
        setStatus('error')
        setErr(`HTTP ${res.status}`)
        return
      }
      const data = await res.json()
      setStatus(String(data.status || 'ok'))
      // SENSEX may not be on Angel index tokens — try NIFTY shape first
      const key = underlying === 'SENSEX' ? 'NIFTY' : underlying
      const price = parseLtp(data, key)
      if (price != null) {
        setLiveLtp(price)
        setIsBridgeLive(data.status === 'live' || price > 0)
        setTickTimestamp(
          new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
        )
        setErr('')
      } else {
        setIsBridgeLive(false)
        setErr(data.quoteError || data.error || 'No LTP')
      }
    } catch (e) {
      setIsBridgeLive(false)
      setStatus('error')
      setErr(String(e))
    }
  }, [underlying])

  useEffect(() => {
    void fetchBridgeTicks()
    const interval = setInterval(() => void fetchBridgeTicks(), 3000)
    return () => clearInterval(interval)
  }, [fetchBridgeTicks])

  const spot = liveLtp ?? 0
  const vwapAnchor = spot > 0 ? (underlying === 'NIFTY' ? spot - 14.5 : spot - 52.0) : 0

  // Scenario bands only — educational offsets from last known spot
  const timeProjections =
    spot > 0
      ? [
          {
            horizon: 'Next 5 Minutes',
            targetBand: `${(spot + 15).toFixed(1)} – ${(spot + 28).toFixed(1)}`,
            bias: 'SCENARIO A',
            probability: '—',
            driver: 'Example band above spot — not a signal. Confirm on chart.',
            invalidation: (spot - 22).toFixed(1),
          },
          {
            horizon: 'Next 10 Minutes',
            targetBand: `${(spot + 25).toFixed(1)} – ${(spot + 45).toFixed(1)}`,
            bias: 'SCENARIO B',
            probability: '—',
            driver: 'Example expansion band — use your own plan.',
            invalidation: (spot - 35).toFixed(1),
          },
          {
            horizon: 'Next 30 Minutes',
            targetBand: `${(spot + 40).toFixed(1)} – ${(spot + 70).toFixed(1)}`,
            bias: 'SCENARIO C',
            probability: '—',
            driver: 'Wider range for structure — not predicted outcome.',
            invalidation: (spot - 55).toFixed(1),
          },
          {
            horizon: 'Session range idea',
            targetBand: `${(spot - 30).toFixed(1)} – ${(spot + 110).toFixed(1)}`,
            bias: 'RANGE FRAME',
            probability: '—',
            driver: 'Rough session envelope for planning stops only.',
            invalidation: (spot - 90).toFixed(1),
          },
        ]
      : []

  const chartSym =
    underlying === 'SENSEX' ? 'BSE:SENSEX' : `NSE:${underlying}`

  return (
    <div className="space-y-6 font-mono">
      <div className="bg-[#0D182E] border border-[#D4AF37]/30 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isBridgeLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider">
              {isBridgeLive
                ? `ANGEL LTP LIVE (${tickTimestamp} IST)`
                : `BRIDGE ${status.toUpperCase()}`}
            </span>
            {err ? (
              <span className="text-[10px] text-rose-300 max-w-sm truncate">{err}</span>
            ) : null}
          </div>
          <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">
            Intraday Index Desk
          </h2>
          <p className="text-xs text-[#94A3B8]">
            Live LTP from Angel bridge · chart TradingView · table = scenario bands only
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#070E1C] p-1.5 rounded-xl border border-[#D4AF37]/30">
            {(['NIFTY', 'BANKNIFTY', 'SENSEX'] as const).map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => setUnderlying(sym)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
            className="p-2 bg-[#070E1C] border border-[#D4AF37]/30 text-[#D4AF37] rounded-xl"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] block uppercase">Live Spot LTP</span>
          <span className="text-2xl font-bold text-[#FDFBF7]">
            {liveLtp != null
              ? liveLtp.toLocaleString('en-IN', { maximumFractionDigits: 2 })
              : '—'}
          </span>
          <span
            className={`text-xs font-semibold block ${
              isBridgeLive ? 'text-emerald-400' : 'text-amber-300'
            }`}
          >
            {isBridgeLive ? 'LIVE' : 'WAITING'}
          </span>
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] block uppercase">Offset ref</span>
          <span className="text-2xl font-bold text-[#D4AF37]">
            {vwapAnchor > 0 ? vwapAnchor.toFixed(2) : '—'}
          </span>
          <span className="text-xs text-[#94A3B8] block">not true VWAP</span>
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] block uppercase">Source</span>
          <span className="text-sm font-bold text-[#D4AF37]">Angel SmartAPI</span>
          <span className="text-xs text-[#94A3B8] block">poll ~3s</span>
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] block uppercase">Rule</span>
          <span className="text-xs text-[#CBD5E1] block">
            Execute on broker. Confirm price there.
          </span>
        </div>
      </div>

      <div className="bg-[#0D182E] border border-[#D4AF37]/30 p-4 rounded-2xl">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-[#FDFBF7] flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#D4AF37]" /> {chartSym}
          </span>
          <span className="text-[11px] text-[#94A3B8]">5m chart</span>
        </div>
        <div className="w-full h-[480px] rounded-xl overflow-hidden border border-[#1E2E4E] bg-black">
          <iframe
            key={chartSym}
            title={chartSym}
            className="w-full h-full border-none"
            src={tvChart(chartSym, '5')}
          />
        </div>
      </div>

      <div className="bg-[#0D182E] border border-[#D4AF37]/30 rounded-2xl overflow-hidden">
        <div className="p-4 bg-[#12203D] border-b border-[#D4AF37]/20">
          <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
            Scenario bands from last LTP (not predictions)
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#D4AF37]/15 bg-[#070E1C] text-[#94A3B8]">
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
                    Waiting for live LTP…
                  </td>
                </tr>
              ) : (
                timeProjections.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#D4AF37]/5">
                    <td className="p-3.5 font-bold text-[#D4AF37]">{row.horizon}</td>
                    <td className="p-3.5 font-mono text-emerald-400 font-bold">
                      {row.targetBand}
                    </td>
                    <td className="p-3.5">{row.bias}</td>
                    <td className="p-3.5 text-[#CBD5E1] max-w-xs">{row.driver}</td>
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

// =========================================================================
// 2. STOCK SCREENER
// =========================================================================
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
    'TCS',
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
          <p className="text-xs text-[#94A3B8]">TradingView NSE:{activeSymbol}</p>
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
          <div className="w-full h-[520px] rounded-xl overflow-hidden border border-[#1E2E4E] bg-black">
            <iframe
              key={nse}
              title={nse}
              className="w-full h-full border-none"
              src={tvChart(nse, 'D')}
            />
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-[#0D182E] border border-[#D4AF37]/30 p-4 rounded-2xl">
            <div className="w-full h-[420px] rounded-xl overflow-hidden border border-[#1E2E4E] bg-black">
              <iframe
                key={`ta-${nse}`}
                title={`TA ${nse}`}
                className="w-full h-full border-none"
                src={tvTech(nse, '1D')}
              />
            </div>
          </div>
          <div className="bg-[#0D182E] border border-rose-500/30 p-4 rounded-2xl text-xs">
            <span className="text-rose-400 font-bold flex items-center gap-1.5 mb-2">
              <ShieldAlert className="w-4 h-4" /> Risk
            </span>
            <p className="text-[#CBD5E1] text-[11px]">
              Confirm price on broker before any order for {activeSymbol}.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export const InstitutionalFlowsDesk: React.FC = () => {
  const flows = [
    {
      session: 'Sample row A',
      fiiBuy: '—',
      fiiSell: '—',
      fiiNet: '—',
      diiBuy: '—',
      diiSell: '—',
      diiNet: '—',
      netTotal: '—',
    },
  ]
  return (
    <div className="space-y-6 font-mono">
      <h2 className="text-xl font-bold font-serif text-[#FDFBF7]">FII / DII</h2>
      <p className="text-xs text-[#94A3B8]">
        Use official NSE provisional after close:{' '}
        <a
          className="text-[#D4AF37] underline"
          href="https://www.nseindia.com/reports/fii-dii"
          target="_blank"
          rel="noreferrer"
        >
          nseindia.com/reports/fii-dii
        </a>
      </p>
      <div className="bg-[#0D182E] border border-[#D4AF37]/30 rounded-2xl p-4 text-xs text-[#CBD5E1]">
        We do not show fake “verified live FII” numbers. Check NSE each day.
      </div>
      <div className="hidden">{flows[0].session}</div>
    </div>
  )
}

export const VisualNewsWireDesk: React.FC = () => (
  <div className="space-y-4 font-mono">
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">Market timeline</h2>
    <div className="w-full h-[620px] rounded-2xl overflow-hidden border border-[#D4AF37]/30 bg-black">
      <iframe
        title="timeline"
        className="w-full h-full border-none"
        src="https://s.tradingview.com/embed-widget/timeline/?locale=en#%7B%22feedMode%22%3A%22all_symbols%22%2C%22isTransparent%22%3Atrue%2C%22displayMode%22%3A%22regular%22%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22colorTheme%22%3A%22dark%22%7D"
      />
    </div>
  </div>
)

export const FinancialAdvisorConsensus: React.FC = () => (
  <div className="space-y-3 font-mono text-sm text-[#CBD5E1]">
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">Research</h2>
    <p className="text-xs">Use broker research / Trendlyne — no fabricated targets here.</p>
  </div>
)

export const SectorEtfMatrix: React.FC = () => (
  <div className="space-y-4 font-mono">
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">ETF charts</h2>
    <div className="grid md:grid-cols-2 gap-3">
      {['NSE:SILVERBEES', 'NSE:GOLDBEES', 'NSE:ITBEES', 'NSE:BANKBEES'].map((sym) => (
        <div key={sym} className="bg-[#0D182E] border border-[#D4AF37]/25 p-3 rounded-xl">
          <div className="text-xs text-[#FDFBF7] font-bold mb-2">{sym}</div>
          <div className="h-[200px] rounded-lg overflow-hidden bg-black">
            <iframe title={sym} className="w-full h-full border-none" src={tvChart(sym, 'D')} />
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
        <span className="text-[#D4AF37] font-bold flex items-center gap-1.5 mb-2">
          <ShieldAlert className="w-4 h-4" /> Size risk
        </span>
        Fixed % of capital per idea (many use ≤1–2%).
      </div>
      <div className="bg-[#0D182E] border border-[#D4AF37]/25 p-5 rounded-2xl">
        <span className="text-amber-300 font-bold flex items-center gap-1.5 mb-2">
          <Activity className="w-4 h-4" /> Invalidation
        </span>
        Pre-define stop; no move without it.
      </div>
      <div className="bg-[#0D182E] border border-[#D4AF37]/25 p-5 rounded-2xl">
        <span className="text-emerald-400 font-bold flex items-center gap-1.5 mb-2">
          <Zap className="w-4 h-4" /> Confirm on broker
        </span>
        Always match LTP on Groww / IND Money / Angel app.
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
  return <div className="text-sm text-[#FDFBF7]">IPO — NSE / SEBI official</div>
}

export const ExtraPages: React.FC = () => <FoDecisionDesk />
export default ExtraPages
