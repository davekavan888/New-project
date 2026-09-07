import React, { useState, useEffect, useCallback } from 'react'
import {
  Search,
  BarChart2,
  ShieldAlert,
  Activity,
  Zap,
  RefreshCw,
  PlusCircle,
  X,
  Clock,
} from 'lucide-react'

const BRIDGE_URL = String(
  (import.meta as any).env?.VITE_ANGEL_BRIDGE_URL || '',
).replace(/\/$/, '')

interface TradeLog {
  id: string
  time: string
  asset: string
  direction: 'LONG' | 'SHORT'
  entryPrice: string
  stopLoss: string
  target: string
  status: 'ACTIVE' | 'HIT' | 'STOPPED'
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

export const FoDecisionDesk: React.FC = () => {
  const [underlying, setUnderlying] = useState<'NIFTY' | 'BANKNIFTY' | 'SENSEX'>('NIFTY')
  const [liveLtp, setLiveLtp] = useState<number | null>(null)
  const [isBridgeLive, setIsBridgeLive] = useState(false)
  const [tickTimestamp, setTickTimestamp] = useState('--:--:--')
  const [err, setErr] = useState('')

  // Manual ORB levels (true 9:15–9:30 high/low must be marked by you after open)
  const [orbHigh, setOrbHigh] = useState('')
  const [orbLow, setOrbLow] = useState('')

  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [journalLogs, setJournalLogs] = useState<TradeLog[]>(() => {
    try {
      const saved = localStorage.getItem('novaforge_journal')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [logForm, setLogForm] = useState({
    direction: 'LONG' as 'LONG' | 'SHORT',
    entryPrice: '',
    stopLoss: '',
    target: '',
  })

  const fetchBridgeTicks = useCallback(async () => {
    if (!BRIDGE_URL) {
      setIsBridgeLive(false)
      setErr('Set VITE_ANGEL_BRIDGE_URL on Vercel')
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
        setErr(
          underlying === 'SENSEX'
            ? 'SENSEX LTP proxied from NIFTY feed; chart is BSE:SENSEX'
            : '',
        )
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

  const spot = liveLtp
  const oh = parseFloat(orbHigh)
  const ol = parseFloat(orbLow)
  const hasOrb = !Number.isNaN(oh) && !Number.isNaN(ol) && oh > ol

  const orbStatus =
    spot != null && hasOrb
      ? spot > oh
        ? {
            text: 'ABOVE YOUR ORB HIGH',
            color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          }
        : spot < ol
          ? {
              text: 'BELOW YOUR ORB LOW',
              color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
            }
          : {
              text: 'INSIDE YOUR ORB RANGE',
              color: 'text-amber-300 bg-amber-400/10 border-amber-400/30',
            }
      : {
          text: 'SET ORB HIGH / LOW',
          color: 'text-[#94A3B8] bg-[#070E1C] border-[#D4AF37]/20',
        }

  const handleSaveTrade = (e: React.FormEvent) => {
    e.preventDefault()
    if (!logForm.entryPrice || !logForm.stopLoss) return
    const newLog: TradeLog = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      }),
      asset: underlying,
      direction: logForm.direction,
      entryPrice: logForm.entryPrice,
      stopLoss: logForm.stopLoss,
      target: logForm.target || 'Open',
      status: 'ACTIVE',
    }
    const updated = [newLog, ...journalLogs]
    setJournalLogs(updated)
    try {
      localStorage.setItem('novaforge_journal', JSON.stringify(updated))
    } catch {
      /* ignore */
    }
    setIsLogModalOpen(false)
    setLogForm({ direction: 'LONG', entryPrice: '', stopLoss: '', target: '' })
  }

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
            {err ? <span className="text-[10px] text-amber-200/90">{err}</span> : null}
          </div>
          <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">
            Intraday · ORB + Journal
          </h2>
          <p className="text-xs text-[#94A3B8]">
            Live LTP from Angel · mark 9:15–9:30 high/low yourself · log setups
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
          <button
            type="button"
            onClick={() => setIsLogModalOpen(true)}
            className="px-3.5 py-2 bg-[#D4AF37] text-[#070D1E] rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Log Setup
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">Live Spot LTP</span>
          <span className="text-2xl font-bold text-[#FDFBF7]">
            {spot != null
              ? spot.toLocaleString('en-IN', { maximumFractionDigits: 2 })
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
          <span className="text-[10px] text-[#94A3B8] uppercase block">Your ORB High</span>
          <input
            className="w-full mt-1 bg-[#070E1C] border border-emerald-500/30 rounded-lg px-2 py-1.5 text-emerald-400 font-bold text-sm"
            placeholder="After 9:30"
            value={orbHigh}
            onChange={(e) => setOrbHigh(e.target.value)}
          />
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">Your ORB Low</span>
          <input
            className="w-full mt-1 bg-[#070E1C] border border-rose-500/30 rounded-lg px-2 py-1.5 text-rose-400 font-bold text-sm"
            placeholder="After 9:30"
            value={orbLow}
            onChange={(e) => setOrbLow(e.target.value)}
          />
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">ORB vs LTP</span>
          <span
            className={`text-xs px-2 py-1 rounded font-bold border block mt-1.5 text-center ${orbStatus.color}`}
          >
            {orbStatus.text}
          </span>
        </div>
      </div>

      <div className="bg-[#0D182E] border border-[#D4AF37]/30 p-4 rounded-2xl">
        <div className="flex justify-between mb-3 text-xs">
          <span className="font-bold text-[#FDFBF7] flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#D4AF37]" /> {tvSymbol}
          </span>
          <span className="text-[#94A3B8]">5m · mark ORB on chart</span>
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

      {journalLogs.length > 0 && (
        <div className="bg-[#0D182E] border border-[#D4AF37]/30 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between border-b border-[#D4AF37]/20 pb-3">
            <span className="text-xs font-bold text-[#D4AF37] uppercase flex items-center gap-2">
              <Clock className="w-4 h-4" /> Logged setups (this browser)
            </span>
            <span className="text-[10px] text-[#94A3B8]">{journalLogs.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {journalLogs.slice(0, 6).map((log) => (
              <div
                key={log.id}
                className="bg-[#070E1C] border border-[#D4AF37]/20 p-3.5 rounded-xl text-xs space-y-1.5"
              >
                <div className="flex justify-between">
                  <span className="font-bold text-[#FDFBF7]">{log.asset}</span>
                  <span
                    className={
                      log.direction === 'LONG'
                        ? 'text-emerald-400 font-bold'
                        : 'text-rose-400 font-bold'
                    }
                  >
                    {log.direction}
                  </span>
                </div>
                <div className="flex justify-between text-[#94A3B8]">
                  <span>
                    Entry <strong className="text-[#FDFBF7]">{log.entryPrice}</strong>
                  </span>
                  <span>
                    SL <strong className="text-rose-400">{log.stopLoss}</strong>
                  </span>
                </div>
                <div className="text-[10px] text-[#94A3B8] flex justify-between border-t border-[#D4AF37]/10 pt-1">
                  <span>Tgt {log.target}</span>
                  <span>{log.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLogModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0D182E] border-2 border-[#D4AF37] w-full max-w-md rounded-2xl p-6 space-y-4 relative">
            <button
              type="button"
              onClick={() => setIsLogModalOpen(false)}
              className="absolute top-4 right-4 text-[#94A3B8]"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-[#FDFBF7] font-serif">Log setup</h3>
            <form onSubmit={handleSaveTrade} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLogForm({ ...logForm, direction: 'LONG' })}
                  className={`py-2 rounded-lg font-bold ${
                    logForm.direction === 'LONG'
                      ? 'bg-emerald-500 text-black'
                      : 'border border-emerald-500/30 text-[#94A3B8]'
                  }`}
                >
                  LONG
                </button>
                <button
                  type="button"
                  onClick={() => setLogForm({ ...logForm, direction: 'SHORT' })}
                  className={`py-2 rounded-lg font-bold ${
                    logForm.direction === 'SHORT'
                      ? 'bg-rose-500 text-black'
                      : 'border border-rose-500/30 text-[#94A3B8]'
                  }`}
                >
                  SHORT
                </button>
              </div>
              <input
                className="w-full bg-[#070E1C] border border-[#D4AF37]/30 rounded-lg p-2 text-[#FDFBF7]"
                placeholder={
                  spot != null ? `Entry (spot ~ ${spot.toFixed(1)})` : 'Entry'
                }
                value={logForm.entryPrice}
                onChange={(e) => setLogForm({ ...logForm, entryPrice: e.target.value })}
              />
              <input
                className="w-full bg-[#070E1C] border border-rose-500/30 rounded-lg p-2 text-rose-300"
                placeholder="Stop loss"
                value={logForm.stopLoss}
                onChange={(e) => setLogForm({ ...logForm, stopLoss: e.target.value })}
              />
              <input
                className="w-full bg-[#070E1C] border border-[#D4AF37]/30 rounded-lg p-2 text-[#FDFBF7]"
                placeholder="Target"
                value={logForm.target}
                onChange={(e) => setLogForm({ ...logForm, target: e.target.value })}
              />
              <button
                type="submit"
                className="w-full bg-[#D4AF37] text-[#070E1C] font-bold py-2.5 rounded-lg"
              >
                Save
              </button>
            </form>
          </div>
        </div>
      )}
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
    'SBIN',
    'TATASTEEL',
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
          <p className="text-xs text-[#94A3B8]">{nse}</p>
        </div>
        <form onSubmit={handleSearch} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#D4AF37]" />
          <input
            className="w-full bg-[#070E1C] border border-[#D4AF37]/40 rounded-xl pl-9 pr-20 py-2.5 text-xs text-[#FDFBF7]"
            placeholder="Symbol"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 bg-[#D4AF37] text-[#070E1C] px-3 py-1 rounded-lg text-xs font-bold"
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
                ? 'bg-[#D4AF37] text-[#070E1C] font-bold'
                : 'border-[#D4AF37]/20 text-[#CBD5E1]'
            }`}
          >
            {sym}
          </button>
        ))}
      </div>
      <div className="w-full h-[520px] rounded-xl overflow-hidden border border-[#1E2E4E] bg-black">
        <iframe
          key={nse}
          title={nse}
          className="w-full h-full border-none"
          src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(
            nse,
          )}&interval=D&theme=dark&style=1&timezone=Asia%2FKolkata`}
        />
      </div>
    </div>
  )
}

export const InstitutionalFlowsDesk: React.FC = () => (
  <div className="space-y-3 font-mono text-sm text-[#CBD5E1]">
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">FII / DII</h2>
    <a
      className="text-[#D4AF37] underline text-xs"
      href="https://www.nseindia.com/reports/fii-dii"
      target="_blank"
      rel="noreferrer"
    >
      Official NSE FII/DII report
    </a>
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
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">ETFs</h2>
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
  <div className="space-y-4 font-mono text-xs text-[#CBD5E1]">
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">Risk protocol</h2>
    <div className="grid md:grid-cols-3 gap-4">
      <div className="bg-[#0D182E] border border-[#D4AF37]/25 p-5 rounded-2xl">
        <ShieldAlert className="w-4 h-4 text-[#D4AF37] mb-2" /> Fixed size · fixed % risk
      </div>
      <div className="bg-[#0D182E] border border-[#D4AF37]/25 p-5 rounded-2xl">
        <Activity className="w-4 h-4 text-amber-300 mb-2" /> ORB / stop defined before entry
      </div>
      <div className="bg-[#0D182E] border border-[#D4AF37]/25 p-5 rounded-2xl">
        <Zap className="w-4 h-4 text-emerald-400 mb-2" /> Confirm price on broker
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
  return <div className="text-sm text-[#CBD5E1]">Broker research only</div>
}

export const ExtraPages: React.FC = () => <FoDecisionDesk />
export default ExtraPages
