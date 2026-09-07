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
  Target,
  CheckCircle2,
  XCircle,
  Newspaper,
} from 'lucide-react'

const BRIDGE_URL = String(
  (import.meta as any).env?.VITE_ANGEL_BRIDGE_URL || '',
).replace(/\/$/, '')

const FORECAST_KEY = 'novaforge_forecast_log_v1'
const JOURNAL_KEY = 'novaforge_journal'

type Horizon = '5m' | '10m' | '30m'
type Bias = 'BULL' | 'BEAR' | 'RANGE'

interface ForecastRecord {
  id: string
  asset: string
  horizon: Horizon
  bias: Bias
  entryLtp: number
  low: number
  high: number
  lockedAt: number
  resolveAt: number
  resolved: boolean
  exitLtp?: number
  result?: 'HIT' | 'MISS' | 'PENDING'
  reason?: string
}

interface TradeLog {
  id: string
  time: string
  asset: string
  direction: 'LONG' | 'SHORT'
  entryPrice: string
  stopLoss: string
  target: string
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

function horizonMs(h: Horizon) {
  if (h === '5m') return 5 * 60 * 1000
  if (h === '10m') return 10 * 60 * 1000
  return 30 * 60 * 1000
}

function loadForecasts(): ForecastRecord[] {
  try {
    const s = localStorage.getItem(FORECAST_KEY)
    return s ? JSON.parse(s) : []
  } catch {
    return []
  }
}

function saveForecasts(rows: ForecastRecord[]) {
  try {
    localStorage.setItem(FORECAST_KEY, JSON.stringify(rows.slice(0, 80)))
  } catch {
    /* ignore */
  }
}

function evaluateForecast(f: ForecastRecord, exitLtp: number): ForecastRecord {
  const inBand = exitLtp >= f.low && exitLtp <= f.high
  let result: 'HIT' | 'MISS' = 'MISS'
  let reason = ''

  if (f.bias === 'RANGE') {
    result = inBand ? 'HIT' : 'MISS'
    reason = inBand
      ? `Price stayed inside band ${f.low.toFixed(1)}–${f.high.toFixed(1)}`
      : `Price left band (exit ${exitLtp.toFixed(1)} vs ${f.low.toFixed(1)}–${f.high.toFixed(1)})`
  } else if (f.bias === 'BULL') {
    // HIT if ended above entry and not below invalidation (low)
    if (exitLtp >= f.entryLtp && exitLtp >= f.low) {
      result = exitLtp <= f.high || exitLtp > f.entryLtp ? 'HIT' : 'MISS'
      reason =
        exitLtp >= f.entryLtp
          ? `Bull call: price finished above lock ${f.entryLtp.toFixed(1)} (exit ${exitLtp.toFixed(1)})`
          : `Bull call failed`
    } else {
      result = 'MISS'
      reason = `Bull call missed: exit ${exitLtp.toFixed(1)} below entry/lock zone`
    }
    if (exitLtp < f.low) {
      result = 'MISS'
      reason = `Broke below invalidation ${f.low.toFixed(1)}`
    } else if (exitLtp > f.entryLtp) {
      result = 'HIT'
      reason = `Bullish drift: ${f.entryLtp.toFixed(1)} → ${exitLtp.toFixed(1)}`
    }
  } else {
    // BEAR
    if (exitLtp <= f.entryLtp && exitLtp <= f.high) {
      result = 'HIT'
      reason = `Bear call: price finished below lock ${f.entryLtp.toFixed(1)}`
    } else {
      result = 'MISS'
      reason = `Bear call missed: exit ${exitLtp.toFixed(1)} did not hold below entry`
    }
    if (exitLtp > f.high) {
      result = 'MISS'
      reason = `Broke above invalidation ${f.high.toFixed(1)}`
    } else if (exitLtp < f.entryLtp) {
      result = 'HIT'
      reason = `Bearish drift: ${f.entryLtp.toFixed(1)} → ${exitLtp.toFixed(1)}`
    }
  }

  return {
    ...f,
    resolved: true,
    exitLtp,
    result,
    reason,
  }
}

// =========================================================================
// F&O + METERS + SCORECARD + NEWS
// =========================================================================
export const FoDecisionDesk: React.FC = () => {
  const [underlying, setUnderlying] = useState<'NIFTY' | 'BANKNIFTY' | 'SENSEX'>('NIFTY')
  const [liveLtp, setLiveLtp] = useState<number | null>(null)
  const [isBridgeLive, setIsBridgeLive] = useState(false)
  const [tickTimestamp, setTickTimestamp] = useState('--:--:--')
  const [err, setErr] = useState('')

  const [bias5, setBias5] = useState<Bias>('RANGE')
  const [bias10, setBias10] = useState<Bias>('RANGE')
  const [bias30, setBias30] = useState<Bias>('RANGE')

  const [forecasts, setForecasts] = useState<ForecastRecord[]>(() => loadForecasts())
  const [now, setNow] = useState(Date.now())

  const [orbHigh, setOrbHigh] = useState('')
  const [orbLow, setOrbLow] = useState('')
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [journalLogs, setJournalLogs] = useState<TradeLog[]>(() => {
    try {
      const s = localStorage.getItem(JOURNAL_KEY)
      return s ? JSON.parse(s) : []
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
        setErr(underlying === 'SENSEX' ? 'Sensex chart live; LTP may proxy Nifty' : '')
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

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Auto-resolve scorecard when horizon ends
  useEffect(() => {
    if (liveLtp == null) return
    setForecasts((prev) => {
      let changed = false
      const next = prev.map((f) => {
        if (f.resolved) return f
        if (now < f.resolveAt) return f
        if (f.asset !== underlying && f.asset !== 'NIFTY') {
          // still resolve with current feed if same session asset match
        }
        if (f.asset !== underlying) return f
        changed = true
        return evaluateForecast(f, liveLtp)
      })
      if (changed) saveForecasts(next)
      return changed ? next : prev
    })
  }, [now, liveLtp, underlying])

  const spot = liveLtp
  const pad = underlying === 'BANKNIFTY' ? 40 : underlying === 'SENSEX' ? 80 : 20

  const bandFor = (bias: Bias, s: number) => {
    if (bias === 'BULL') return { low: s - pad * 0.5, high: s + pad * 1.5 }
    if (bias === 'BEAR') return { low: s - pad * 1.5, high: s + pad * 0.5 }
    return { low: s - pad, high: s + pad }
  }

  const lockForecast = (horizon: Horizon, bias: Bias) => {
    if (spot == null) return
    const { low, high } = bandFor(bias, spot)
    const rec: ForecastRecord = {
      id: `${Date.now()}-${horizon}`,
      asset: underlying,
      horizon,
      bias,
      entryLtp: spot,
      low,
      high,
      lockedAt: Date.now(),
      resolveAt: Date.now() + horizonMs(horizon),
      resolved: false,
      result: 'PENDING',
    }
    const next = [rec, ...forecasts]
    setForecasts(next)
    saveForecasts(next)
  }

  const resolved = forecasts.filter((f) => f.resolved && f.asset === underlying)
  const hits = resolved.filter((f) => f.result === 'HIT').length
  const misses = resolved.filter((f) => f.result === 'MISS').length
  const hitRate =
    hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : null

  const pending = forecasts.filter(
    (f) => !f.resolved && f.asset === underlying,
  )

  const oh = parseFloat(orbHigh)
  const ol = parseFloat(orbLow)
  const hasOrb = !Number.isNaN(oh) && !Number.isNaN(ol) && oh > ol
  const orbStatus =
    spot != null && hasOrb
      ? spot > oh
        ? { text: 'ABOVE ORB HIGH', color: 'text-emerald-400' }
        : spot < ol
          ? { text: 'BELOW ORB LOW', color: 'text-rose-400' }
          : { text: 'INSIDE ORB', color: 'text-amber-300' }
      : { text: 'SET ORB LEVELS', color: 'text-[#94A3B8]' }

  const tvSymbol =
    underlying === 'SENSEX' ? 'BSE:SENSEX' : `NSE:${underlying}`

  const MeterCard = ({
    label,
    horizon,
    bias,
    setBias,
  }: {
    label: string
    horizon: Horizon
    bias: Bias
    setBias: (b: Bias) => void
  }) => {
    const b = spot != null ? bandFor(bias, spot) : null
    return (
      <div className="bg-[#0D182E] border border-[#D4AF37]/25 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-[#D4AF37] uppercase">{label}</span>
          <Target className="w-4 h-4 text-[#D4AF37]" />
        </div>
        <div className="flex gap-1">
          {(['BULL', 'RANGE', 'BEAR'] as Bias[]).map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => setBias(x)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border ${
                bias === x
                  ? x === 'BULL'
                    ? 'bg-emerald-500 text-black border-emerald-500'
                    : x === 'BEAR'
                      ? 'bg-rose-500 text-black border-rose-500'
                      : 'bg-[#D4AF37] text-black border-[#D4AF37]'
                  : 'border-[#D4AF37]/20 text-[#94A3B8]'
              }`}
            >
              {x}
            </button>
          ))}
        </div>
        <div className="text-xs text-[#CBD5E1]">
          Band:{' '}
          <span className="text-[#FDFBF7] font-mono font-bold">
            {b ? `${b.low.toFixed(1)} – ${b.high.toFixed(1)}` : '—'}
          </span>
        </div>
        <button
          type="button"
          disabled={spot == null}
          onClick={() => lockForecast(horizon, bias)}
          className="w-full py-2 rounded-xl text-xs font-bold bg-[#D4AF37] text-[#070E1C] disabled:opacity-40"
        >
          Lock {horizon} call → scorecard
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-mono">
      <p className="text-xs text-amber-100/90 border border-[#D4AF37]/30 rounded-xl px-3 py-2 bg-[#D4AF37]/5">
        Meters are <strong>your locked calls</strong>, scored against later live LTP. Not a guaranteed
        prediction engine. Green = HIT, Red = MISS + reason.
      </p>

      {/* Header */}
      <div className="bg-[#0D182E] border border-[#D4AF37]/30 p-5 rounded-2xl flex flex-col lg:flex-row justify-between gap-4">
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
            {err ? <span className="text-[10px] text-amber-200">{err}</span> : null}
          </div>
          <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">
            Forecast meters · scorecard · news
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1.5 bg-[#070E1C] p-1.5 rounded-xl border border-[#D4AF37]/30">
            {(['NIFTY', 'BANKNIFTY', 'SENSEX'] as const).map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => setUnderlying(sym)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
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
            className="px-3 py-2 bg-[#D4AF37] text-[#070E1C] rounded-xl text-xs font-bold flex items-center gap-1"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Log trade
          </button>
        </div>
      </div>

      {/* Spot + ORB + score summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">Spot LTP</span>
          <span className="text-2xl font-bold text-[#FDFBF7]">
            {spot != null
              ? spot.toLocaleString('en-IN', { maximumFractionDigits: 2 })
              : '—'}
          </span>
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">ORB High</span>
          <input
            className="w-full mt-1 bg-[#070E1C] border border-emerald-500/30 rounded px-2 py-1 text-emerald-400 text-sm font-bold"
            value={orbHigh}
            onChange={(e) => setOrbHigh(e.target.value)}
            placeholder="after 9:30"
          />
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">ORB Low</span>
          <input
            className="w-full mt-1 bg-[#070E1C] border border-rose-500/30 rounded px-2 py-1 text-rose-400 text-sm font-bold"
            value={orbLow}
            onChange={(e) => setOrbLow(e.target.value)}
            placeholder="after 9:30"
          />
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">ORB status</span>
          <span className={`text-sm font-bold ${orbStatus.color}`}>{orbStatus.text}</span>
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">Scorecard</span>
          <span className="text-2xl font-bold text-[#FDFBF7]">
            {hitRate != null ? `${hitRate}%` : '—'}
          </span>
          <span className="text-[10px] text-[#94A3B8] block">
            {hits} hit · {misses} miss
          </span>
        </div>
      </div>

      {/* 5 / 10 / 30 meters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MeterCard label="Next 5 min" horizon="5m" bias={bias5} setBias={setBias5} />
        <MeterCard label="Next 10 min" horizon="10m" bias={bias10} setBias={setBias10} />
        <MeterCard label="Next 30 min" horizon="30m" bias={bias30} setBias={setBias30} />
      </div>

      {/* Pending timers */}
      {pending.length > 0 && (
        <div className="bg-[#0D182E] border border-[#D4AF37]/25 rounded-2xl p-4 space-y-2">
          <span className="text-xs font-bold text-[#D4AF37] uppercase flex items-center gap-2">
            <Clock className="w-4 h-4" /> Open calls (waiting for time + LTP)
          </span>
          {pending.map((f) => {
            const left = Math.max(0, f.resolveAt - now)
            const m = Math.floor(left / 60000)
            const s = Math.floor((left % 60000) / 1000)
            return (
              <div
                key={f.id}
                className="flex flex-wrap justify-between gap-2 text-xs bg-[#070E1C] border border-[#D4AF37]/15 rounded-xl px-3 py-2"
              >
                <span className="text-[#FDFBF7] font-bold">
                  {f.horizon} · {f.bias} · lock {f.entryLtp.toFixed(1)}
                </span>
                <span className="text-amber-300">
                  resolves in {m}:{String(s).padStart(2, '0')}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Scorecard history */}
      <div className="bg-[#0D182E] border border-[#D4AF37]/30 rounded-2xl overflow-hidden">
        <div className="p-4 bg-[#12203D] border-b border-[#D4AF37]/20 text-xs font-bold text-[#D4AF37] uppercase">
          Report card — locked calls vs later live LTP
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070E1C] text-[#94A3B8] border-b border-[#D4AF37]/15">
              <tr>
                <th className="p-3">When</th>
                <th className="p-3">H</th>
                <th className="p-3">Bias</th>
                <th className="p-3">Lock → Exit</th>
                <th className="p-3">Result</th>
                <th className="p-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4AF37]/10 text-[#FDFBF7]">
              {forecasts.filter((f) => f.asset === underlying).length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-[#94A3B8]">
                    Lock a 5m / 10m / 30m call above. When time ends, result turns green or red.
                  </td>
                </tr>
              ) : (
                forecasts
                  .filter((f) => f.asset === underlying)
                  .slice(0, 12)
                  .map((f) => (
                    <tr key={f.id} className="hover:bg-[#D4AF37]/5">
                      <td className="p-3 text-[#94A3B8]">
                        {new Date(f.lockedAt).toLocaleTimeString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-3 font-bold text-[#D4AF37]">{f.horizon}</td>
                      <td className="p-3">{f.bias}</td>
                      <td className="p-3 font-mono">
                        {f.entryLtp.toFixed(1)}
                        {f.exitLtp != null ? ` → ${f.exitLtp.toFixed(1)}` : ' → …'}
                      </td>
                      <td className="p-3">
                        {f.result === 'HIT' ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> HIT
                          </span>
                        ) : f.result === 'MISS' ? (
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> MISS
                          </span>
                        ) : (
                          <span className="text-amber-300">PENDING</span>
                        )}
                      </td>
                      <td className="p-3 text-[#CBD5E1] max-w-xs">{f.reason || '—'}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-[#0D182E] border border-[#D4AF37]/30 p-4 rounded-2xl">
        <div className="flex justify-between mb-3 text-xs">
          <span className="font-bold text-[#FDFBF7] flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#D4AF37]" /> {tvSymbol}
          </span>
        </div>
        <div className="w-full h-[480px] rounded-xl overflow-hidden bg-black border border-[#1E2E4E]">
          <iframe
            key={tvSymbol}
            title={tvSymbol}
            className="w-full h-full border-none"
            src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(
              tvSymbol,
            )}&interval=5&theme=dark&style=1&timezone=Asia%2FKolkata`}
          />
        </div>
      </div>

      {/* News — India + global style timeline */}
      <div className="bg-[#0D182E] border border-[#D4AF37]/30 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#D4AF37] uppercase">
          <Newspaper className="w-4 h-4" /> Live market news timeline (TradingView)
        </div>
        <p className="text-[11px] text-[#94A3B8]">
          Use headlines for context only. Confirm impact on price with LTP + chart — news alone is not
          a signal.
        </p>
        <div className="w-full h-[420px] rounded-xl overflow-hidden border border-[#1E2E4E] bg-black">
          <iframe
            title="news"
            className="w-full h-full border-none"
            src="https://s.tradingview.com/embed-widget/timeline/?locale=en#%7B%22feedMode%22%3A%22all_symbols%22%2C%22isTransparent%22%3Atrue%2C%22displayMode%22%3A%22regular%22%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22colorTheme%22%3A%22dark%22%7D"
          />
        </div>
        <div className="flex flex-wrap gap-3 text-[11px]">
          <a
            className="text-[#D4AF37] underline"
            href="https://www.moneycontrol.com/news/business/markets/"
            target="_blank"
            rel="noreferrer"
          >
            Moneycontrol markets
          </a>
          <a
            className="text-[#D4AF37] underline"
            href="https://www.bloomberg.com/markets"
            target="_blank"
            rel="noreferrer"
          >
            Bloomberg markets
          </a>
          <a
            className="text-[#D4AF37] underline"
            href="https://www.nseindia.com/reports/fii-dii"
            target="_blank"
            rel="noreferrer"
          >
            NSE FII/DII
          </a>
        </div>
      </div>

      {journalLogs.length > 0 && (
        <div className="text-xs text-[#94A3B8]">
          Trade logs stored: {journalLogs.length} (this browser)
        </div>
      )}

      {isLogModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0D182E] border-2 border-[#D4AF37] w-full max-w-md rounded-2xl p-6 space-y-3 relative">
            <button
              type="button"
              className="absolute top-4 right-4 text-[#94A3B8]"
              onClick={() => setIsLogModalOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-[#FDFBF7]">Log trade</h3>
            <form
              className="space-y-2 text-xs"
              onSubmit={(e) => {
                e.preventDefault()
                if (!logForm.entryPrice || !logForm.stopLoss) return
                const row: TradeLog = {
                  id: String(Date.now()),
                  time: new Date().toLocaleTimeString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  asset: underlying,
                  direction: logForm.direction,
                  entryPrice: logForm.entryPrice,
                  stopLoss: logForm.stopLoss,
                  target: logForm.target || 'Open',
                }
                const next = [row, ...journalLogs]
                setJournalLogs(next)
                try {
                  localStorage.setItem(JOURNAL_KEY, JSON.stringify(next))
                } catch {
                  /* */
                }
                setIsLogModalOpen(false)
              }}
            >
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`py-2 rounded-lg font-bold ${
                    logForm.direction === 'LONG' ? 'bg-emerald-500 text-black' : 'border border-emerald-500/30'
                  }`}
                  onClick={() => setLogForm({ ...logForm, direction: 'LONG' })}
                >
                  LONG
                </button>
                <button
                  type="button"
                  className={`py-2 rounded-lg font-bold ${
                    logForm.direction === 'SHORT' ? 'bg-rose-500 text-black' : 'border border-rose-500/30'
                  }`}
                  onClick={() => setLogForm({ ...logForm, direction: 'SHORT' })}
                >
                  SHORT
                </button>
              </div>
              <input
                className="w-full bg-[#070E1C] border border-[#D4AF37]/30 rounded-lg p-2 text-[#FDFBF7]"
                placeholder="Entry"
                value={logForm.entryPrice}
                onChange={(e) => setLogForm({ ...logForm, entryPrice: e.target.value })}
              />
              <input
                className="w-full bg-[#070E1C] border border-rose-500/30 rounded-lg p-2 text-rose-300"
                placeholder="Stop"
                value={logForm.stopLoss}
                onChange={(e) => setLogForm({ ...logForm, stopLoss: e.target.value })}
              />
              <input
                className="w-full bg-[#070E1C] border border-[#D4AF37]/30 rounded-lg p-2 text-[#FDFBF7]"
                placeholder="Target"
                value={logForm.target}
                onChange={(e) => setLogForm({ ...logForm, target: e.target.value })}
              />
              <button type="submit" className="w-full bg-[#D4AF37] text-[#070E1C] font-bold py-2 rounded-lg">
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
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = inputVal.trim().toUpperCase().replace(/\.NS$/i, '').replace(/^NSE:/i, '')
    if (clean) {
      setActiveSymbol(clean)
      setInputVal('')
    }
  }
  const nse = `NSE:${activeSymbol}`
  return (
    <div className="space-y-4 font-mono">
      <form onSubmit={handleSearch} className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-3 text-[#D4AF37]" />
        <input
          className="w-full bg-[#0D182E] border border-[#D4AF37]/40 rounded-xl pl-9 pr-20 py-2.5 text-xs text-[#FDFBF7]"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="NSE symbol"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1.5 bg-[#D4AF37] text-[#070E1C] px-3 py-1 rounded-lg text-xs font-bold"
        >
          Load
        </button>
      </form>
      <div className="h-[520px] rounded-xl overflow-hidden bg-black border border-[#1E2E4E]">
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
  <div className="font-mono text-sm text-[#CBD5E1] space-y-2">
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">FII / DII</h2>
    <a
      className="text-[#D4AF37] underline text-xs"
      href="https://www.nseindia.com/reports/fii-dii"
      target="_blank"
      rel="noreferrer"
    >
      NSE official report
    </a>
  </div>
)

export const VisualNewsWireDesk: React.FC = () => (
  <div className="space-y-3 font-mono">
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">News wire</h2>
    <div className="h-[620px] rounded-2xl overflow-hidden border border-[#D4AF37]/30 bg-black">
      <iframe
        title="news"
        className="w-full h-full border-none"
        src="https://s.tradingview.com/embed-widget/timeline/?locale=en#%7B%22feedMode%22%3A%22all_symbols%22%2C%22isTransparent%22%3Atrue%2C%22displayMode%22%3A%22regular%22%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22colorTheme%22%3A%22dark%22%7D"
      />
    </div>
  </div>
)

export const SectorEtfMatrix: React.FC = () => (
  <div className="font-mono text-sm text-[#CBD5E1]">ETF charts on F&O / screener style — use Screener for symbols.</div>
)

export const RiskProtocolDesk: React.FC = () => (
  <div className="grid md:grid-cols-3 gap-4 text-xs text-[#CBD5E1] font-mono">
    <div className="bg-[#0D182E] border border-[#D4AF37]/25 p-5 rounded-2xl">
      <ShieldAlert className="w-4 h-4 text-[#D4AF37] mb-2" /> Fixed % risk
    </div>
    <div className="bg-[#0D182E] border border-[#D4AF37]/25 p-5 rounded-2xl">
      <Activity className="w-4 h-4 text-amber-300 mb-2" /> Lock forecast only when LTP is LIVE
    </div>
    <div className="bg-[#0D182E] border border-[#D4AF37]/25 p-5 rounded-2xl">
      <Zap className="w-4 h-4 text-emerald-400 mb-2" /> Broker confirms price
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
  return <div className="text-sm text-[#FDFBF7]">IPO — NSE</div>
}
export function FinancialAdvisorConsensus() {
  return <div className="text-sm text-[#CBD5E1]">Broker research</div>
}

export const ExtraPages: React.FC = () => <FoDecisionDesk />
export default ExtraPages
