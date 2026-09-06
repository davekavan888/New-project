import React, { useState, useEffect, useCallback } from 'react'
import { Search, ShieldAlert, BarChart2, Zap, RefreshCw } from 'lucide-react'

const BRIDGE_URL = String((import.meta as any).env?.VITE_ANGEL_BRIDGE_URL || '').replace(/\/$/, '')

/** Reliable TradingView chart URL for NSE cash / index symbols */
function tvChartUrl(symbol: string, interval: string) {
  const sym = encodeURIComponent(symbol)
  return `https://s.tradingview.com/widgetembed/?symbol=${sym}&interval=${interval}&theme=dark&style=1&timezone=Asia%2FKolkata&hideideas=1&hide_legend=0&saveimage=0`
}

function tvTechUrl(symbol: string, interval: string) {
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
  return `https://s.tradingview.com/embed-widget/technical-analysis/?locale=en#${encodeURIComponent(JSON.stringify(payload))}`
}

function parseBridgeLtp(data: any, underlying: 'NIFTY' | 'BANKNIFTY'): number | null {
  if (!data) return null
  if (data.ltp && typeof data.ltp === 'object') {
    const p = data.ltp[underlying]
    if (p != null && Number(p) > 0) return Number(p)
  }
  const nested = underlying === 'NIFTY' ? data.nifty ?? data.NIFTY : data.bankNifty ?? data.BANKNIFTY
  if (nested?.ltp != null && Number(nested.ltp) > 0) return Number(nested.ltp)
  if (typeof nested === 'number' && nested > 0) return nested
  return null
}

// =========================================================================
// STOCK SCREENER — fixed NSE TradingView (was resolving to Apple)
// =========================================================================
export const UniversalStockScreener: React.FC = () => {
  const [activeSymbol, setActiveSymbol] = useState('RELIANCE')
  const [inputVal, setInputVal] = useState('')
  const quickPicks = [
    'RELIANCE',
    'HDFCBANK',
    'ICICIBANK',
    'INFY',
    'TATASTEEL',
    'SBIN',
    'TCS',
    'WIPRO',
    'DIXON',
  ]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = inputVal
      .trim()
      .toUpperCase()
      .replace(/\.NS$/i, '')
      .replace(/^NSE:/i, '')
      .replace(/\s+/g, '')
    if (clean) {
      setActiveSymbol(clean)
      setInputVal('')
    }
  }

  const nseSym = `NSE:${activeSymbol}`

  return (
    <div className="space-y-6 font-mono">
      <div className="bg-[#0D182E] border border-[#D4AF37]/30 p-5 rounded-2xl flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">Equity Chart Desk</h2>
          <p className="text-xs text-[#94A3B8]">
            Live chart via TradingView for NSE:{activeSymbol} · use for structure, levels, indicators
          </p>
        </div>
        <form onSubmit={handleSearch} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#D4AF37]" />
          <input
            type="text"
            placeholder="NSE symbol e.g. SBIN, IRFC, BEL"
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

      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[#94A3B8] shrink-0">Quick:</span>
        {quickPicks.map((sym) => (
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
        <div className="lg:col-span-2 bg-[#0D182E] border border-[#D4AF37]/30 p-4 rounded-2xl space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-bold text-[#FDFBF7] flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#D4AF37]" /> {nseSym}
            </span>
            <span className="text-[#94A3B8]">TradingView · India session</span>
          </div>
          <div className="w-full h-[520px] rounded-xl overflow-hidden border border-[#1E2E4E] bg-black">
            <iframe
              key={nseSym}
              title={nseSym}
              className="w-full h-full border-none"
              src={tvChartUrl(nseSym, 'D')}
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope"
            />
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-[#0D182E] border border-[#D4AF37]/30 p-4 rounded-2xl">
            <div className="text-xs font-bold text-[#FDFBF7] mb-2 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#D4AF37]" /> Technical summary
            </div>
            <div className="w-full h-[420px] rounded-xl overflow-hidden border border-[#1E2E4E] bg-black">
              <iframe
                key={`ta-${nseSym}`}
                title={`TA ${nseSym}`}
                className="w-full h-full border-none"
                src={tvTechUrl(nseSym, '1D')}
              />
            </div>
          </div>
          <div className="bg-[#0D182E] border border-rose-500/30 p-4 rounded-2xl text-xs">
            <span className="text-rose-400 font-bold flex items-center gap-1.5 mb-2">
              <ShieldAlert className="w-4 h-4" /> Before you trade
            </span>
            <p className="text-[#CBD5E1] text-[11px] leading-relaxed">
              Confirm price on Groww / IND Money / broker. Chart is for structure. Define invalidation before entry.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// =========================================================================
// F&O — Angel bridge LTP + TV chart
// =========================================================================
export const FoDecisionDesk: React.FC = () => {
  const [indexSym, setIndexSym] = useState<'NIFTY' | 'BANKNIFTY'>('NIFTY')
  const [ltp, setLtp] = useState<number | null>(null)
  const [status, setStatus] = useState('starting')
  const [err, setErr] = useState('')
  const [ts, setTs] = useState('')

  const pull = useCallback(async () => {
    if (!BRIDGE_URL) {
      setStatus('no_bridge')
      setErr('Set VITE_ANGEL_BRIDGE_URL on Vercel to your Railway URL')
      return
    }
    try {
      const res = await fetch(`${BRIDGE_URL}/snapshot`, { cache: 'no-store' })
      if (!res.ok) {
        setStatus('error')
        setErr(`HTTP ${res.status}`)
        return
      }
      const data = await res.json()
      const price = parseBridgeLtp(data, indexSym)
      setStatus(String(data.status || 'ok'))
      if (price != null) {
        setLtp(price)
        setErr('')
        setTs(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }))
      } else {
        setErr(data.quoteError || data.error || 'No LTP in snapshot')
      }
    } catch (e) {
      setStatus('error')
      setErr(String(e))
    }
  }, [indexSym])

  useEffect(() => {
    void pull()
    const id = setInterval(() => void pull(), 3000)
    return () => clearInterval(id)
  }, [pull])

  const live = status === 'live' && ltp != null
  const nseIndex = indexSym === 'NIFTY' ? 'NSE:NIFTY' : 'NSE:BANKNIFTY'

  return (
    <div className="space-y-6 font-mono">
      <div className="bg-[#0D182E] border border-[#D4AF37]/30 p-5 rounded-2xl flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`w-2.5 h-2.5 rounded-full ${live ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}
            />
            <span className="text-[11px] font-bold text-[#D4AF37] uppercase">
              {live ? `ANGEL LTP LIVE · ${ts} IST` : 'BRIDGE OFF / DEMO'}
            </span>
            {err ? <span className="text-[10px] text-rose-300 max-w-md truncate">{err}</span> : null}
          </div>
          <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">Index Desk — {indexSym}</h2>
          <p className="text-xs text-[#94A3B8]">
            Live LTP from your Angel Railway bridge · chart from TradingView
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 bg-[#070E1C] p-1.5 rounded-xl border border-[#D4AF37]/30">
            {(['NIFTY', 'BANKNIFTY'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setIndexSym(s)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold ${
                  indexSym === s ? 'bg-[#D4AF37] text-[#070E1C]' : 'text-[#94A3B8]'
                }`}
              >
                {s === 'NIFTY' ? 'NIFTY 50' : 'BANKNIFTY'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void pull()}
            className="p-2 border border-[#D4AF37]/30 rounded-xl text-[#D4AF37]"
            title="Refresh LTP"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl col-span-2 md:col-span-1">
          <span className="text-[10px] text-[#94A3B8] uppercase block">Spot LTP</span>
          <span className="text-3xl font-bold text-[#FDFBF7]">
            {ltp != null ? ltp.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}
          </span>
          <span className={`text-xs font-bold block mt-1 ${live ? 'text-emerald-400' : 'text-amber-300'}`}>
            {live ? 'LIVE' : status}
          </span>
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">Source</span>
          <span className="text-sm font-bold text-[#D4AF37]">Angel SmartAPI</span>
          <span className="text-[10px] text-[#94A3B8] block">REST poll ~3s</span>
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl col-span-2">
          <span className="text-[10px] text-[#94A3B8] uppercase block">Trading note</span>
          <span className="text-xs text-[#CBD5E1]">
            Execute on broker app. Use chart for levels. Options need your own risk limits.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0D182E] border border-[#D4AF37]/30 p-4 rounded-2xl">
          <div className="w-full h-[480px] rounded-xl overflow-hidden border border-[#1E2E4E] bg-black">
            <iframe
              key={nseIndex}
              title={nseIndex}
              className="w-full h-full border-none"
              src={tvChartUrl(nseIndex, '5')}
            />
          </div>
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/30 p-4 rounded-2xl">
          <div className="w-full h-[480px] rounded-xl overflow-hidden border border-[#1E2E4E] bg-black">
            <iframe
              key={`ta-${nseIndex}`}
              title={`TA ${nseIndex}`}
              className="w-full h-full border-none"
              src={tvTechUrl(nseIndex, '5m')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export const InstitutionalFlowsDesk: React.FC = () => (
  <div className="space-y-4 font-mono">
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">FII / DII</h2>
    <p className="text-xs text-[#94A3B8]">
      Official FII/DII is usually <strong className="text-[#D4AF37]">end-of-day</strong> from NSE (not
      tick-by-tick). For trading decisions, check today&apos;s provisional on{' '}
      <a
        className="text-[#D4AF37] underline"
        href="https://www.nseindia.com/reports/fii-dii"
        target="_blank"
        rel="noreferrer"
      >
        nseindia.com/reports/fii-dii
      </a>{' '}
      after market.
    </p>
    <div className="bg-[#0D182E] border border-[#D4AF37]/30 rounded-2xl p-5 text-sm text-[#CBD5E1]">
      Open NSE FII/DII report in a tab each morning. Intraday “live FII” feeds that claim real-time
      institutional cash are often delayed or unofficial.
    </div>
  </div>
)

export const VisualNewsWireDesk: React.FC = () => (
  <div className="space-y-4 font-mono">
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">Market timeline</h2>
    <div className="w-full h-[600px] rounded-2xl overflow-hidden border border-[#D4AF37]/30 bg-black">
      <iframe
        title="TV timeline"
        className="w-full h-full border-none"
        src="https://s.tradingview.com/embed-widget/timeline/?locale=en#%7B%22feedMode%22%3A%22all_symbols%22%2C%22isTransparent%22%3Atrue%2C%22displayMode%22%3A%22regular%22%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22colorTheme%22%3A%22dark%22%7D"
      />
    </div>
  </div>
)

export const FinancialAdvisorConsensus: React.FC = () => (
  <div className="space-y-3 font-mono text-sm text-[#CBD5E1]">
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">Research</h2>
    <p className="text-xs">
      Broker targets change often. Prefer official research PDFs / Trendlyne / Moneycontrol consensus —
      we do not fabricate live targets here.
    </p>
  </div>
)

export const SectorEtfMatrix: React.FC = () => (
  <div className="space-y-4 font-mono">
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">ETF map</h2>
    <div className="grid md:grid-cols-2 gap-3 text-xs">
      {[
        ['SILVERBEES', 'NSE:SILVERBEES'],
        ['GOLDBEES', 'NSE:GOLDBEES'],
        ['ITBEES', 'NSE:ITBEES'],
        ['BANKBEES', 'NSE:BANKBEES'],
      ].map(([name, sym]) => (
        <div key={name} className="bg-[#0D182E] border border-[#D4AF37]/25 p-4 rounded-xl">
          <div className="text-[#FDFBF7] font-bold mb-2">{name}</div>
          <div className="h-[220px] rounded-lg overflow-hidden border border-[#1E2E4E] bg-black">
            <iframe title={sym} className="w-full h-full border-none" src={tvChartUrl(sym, 'D')} />
          </div>
        </div>
      ))}
    </div>
  </div>
)

export const RiskProtocolDesk: React.FC = () => (
  <div className="space-y-4 font-mono">
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">Risk protocol</h2>
    <ul className="text-xs text-[#CBD5E1] space-y-2 list-disc pl-5">
      <li>Size so a full stop is a small % of capital (many use ≤1–2%).</li>
      <li>No trade if LTP feed is not LIVE and you need precision entries.</li>
      <li>Options can go to zero — hard max loss per day.</li>
      <li>Confirm every price on the broker app before order.</li>
    </ul>
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
  return <div className="text-sm text-[#FDFBF7]">IPO — use NSE / SEBI official pages</div>
}

export const ExtraPages: React.FC = () => <UniversalStockScreener />
export default ExtraPages
