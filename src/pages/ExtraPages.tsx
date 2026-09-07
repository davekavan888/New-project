import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
  BookOpen,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'

const BRIDGE_URL = String(
  (import.meta as any).env?.VITE_ANGEL_BRIDGE_URL || '',
).replace(/\/$/, '')

const FORECAST_KEY = 'novaforge_kd_forecast_v3'
const JOURNAL_KEY = 'novaforge_journal'

type Horizon = '10m' | '30m' | '2h' | 'eod'
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

const PLAYBOOK: { id: string; title: string; body: string }[] = [
  {
    id: 'orb',
    title: 'Opening Range',
    body: '9:15–9:30 IST sets the opening range. Mark high/low after 9:30. Break and hold = directional interest; wait for retest when unsure.',
  },
  {
    id: 'vwap',
    title: 'VWAP',
    body: 'Session average price anchor on the chart. Above often supports long bias; below supports short bias for intraday structure.',
  },
  {
    id: 'invalidation',
    title: 'Invalidation',
    body: 'Write the price that proves you wrong before entry. If hit, exit. No averaging down on intraday options.',
  },
  {
    id: 'session',
    title: 'Session clock',
    body: 'Open = volatile. Midday = often cleaner. 14:30–15:15 = close positioning. 3:15 PM is cash market close.',
  },
  {
    id: 'rr',
    title: 'R:R',
    body: 'Prefer targets at least ~1.5–2.5× stop distance. Skip poor R:R even if direction feels right.',
  },
  {
    id: 'notrade',
    title: 'WAIT',
    body: 'No live LTP, unclear level, or daily loss limit hit — WAIT is a valid professional outcome.',
  },
]

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

function getIstNowParts() {
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const o: Record<string, string> = {}
  for (const p of dtf.formatToParts(new Date())) {
    if (p.type !== 'literal') o[p.type] = p.value
  }
  return o
}

function today315IstMs(): number {
  const p = getIstNowParts()
  return Date.parse(`${p.year}-${p.month}-${p.day}T15:15:00+05:30`)
}

function horizonResolveAt(h: Horizon): number {
  const now = Date.now()
  if (h === '10m') return now + 10 * 60 * 1000
  if (h === '30m') return now + 30 * 60 * 1000
  if (h === '2h') return now + 2 * 60 * 60 * 1000
  const eod = today315IstMs()
  if (eod > now + 30_000) return eod
  return now + 2 * 60 * 1000
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
    localStorage.setItem(FORECAST_KEY, JSON.stringify(rows.slice(0, 100)))
  } catch {
    /* */
  }
}

function evaluateForecast(f: ForecastRecord, exitLtp: number): ForecastRecord {
  let result: 'HIT' | 'MISS' = 'MISS'
  let reason = ''
  if (f.bias === 'RANGE') {
    const inBand = exitLtp >= f.low && exitLtp <= f.high
    result = inBand ? 'HIT' : 'MISS'
    reason = inBand
      ? `Range held: exit ${exitLtp.toFixed(1)} inside ${f.low.toFixed(1)}–${f.high.toFixed(1)}`
      : `Range break: exit ${exitLtp.toFixed(1)} outside band`
  } else if (f.bias === 'BULL') {
    if (exitLtp < f.low) {
      result = 'MISS'
      reason = `Bull invalidated below ${f.low.toFixed(1)}`
    } else if (exitLtp >= f.entryLtp) {
      result = 'HIT'
      reason = `Bull: ${f.entryLtp.toFixed(1)} → ${exitLtp.toFixed(1)}`
    } else {
      result = 'MISS'
      reason = `Bull failed vs lock ${f.entryLtp.toFixed(1)}`
    }
  } else {
    if (exitLtp > f.high) {
      result = 'MISS'
      reason = `Bear invalidated above ${f.high.toFixed(1)}`
    } else if (exitLtp <= f.entryLtp) {
      result = 'HIT'
      reason = `Bear: ${f.entryLtp.toFixed(1)} → ${exitLtp.toFixed(1)}`
    } else {
      result = 'MISS'
      reason = `Bear failed vs lock ${f.entryLtp.toFixed(1)}`
    }
  }
  return { ...f, resolved: true, exitLtp, result, reason }
}

/** Simple pressure meter from LTP path + open bias locks */
function pressureScore(
  spot: number | null,
  pending: ForecastRecord[],
  orbHigh: number,
  orbLow: number,
): { score: number; label: string; color: string } {
  let score = 50
  if (spot != null && !Number.isNaN(orbHigh) && !Number.isNaN(orbLow) && orbHigh > orbLow) {
    if (spot > orbHigh) score += 18
    else if (spot < orbLow) score -= 18
    else score += ((spot - orbLow) / (orbHigh - orbLow) - 0.5) * 20
  }
  for (const f of pending) {
    if (f.bias === 'BULL') score += 6
    if (f.bias === 'BEAR') score -= 6
  }
  score = Math.max(0, Math.min(100, Math.round(score)))
  if (score >= 62)
    return { score, label: 'BULLISH PRESSURE', color: 'text-emerald-400' }
  if (score <= 38)
    return { score, label: 'BEARISH PRESSURE', color: 'text-rose-400' }
  return { score, label: 'NEUTRAL / RANGE', color: 'text-amber-300' }
}

export const FoDecisionDesk: React.FC = () => {
  const [underlying, setUnderlying] = useState<'NIFTY' | 'BANKNIFTY' | 'SENSEX'>('NIFTY')
  const [liveLtp, setLiveLtp] = useState<number | null>(null)
  const [isBridgeLive, setIsBridgeLive] = useState(false)
  const [tickTimestamp, setTickTimestamp] = useState('--:--:--')
  const [err, setErr] = useState('')

  const [bias10, setBias10] = useState<Bias>('RANGE')
  const [bias30, setBias30] = useState<Bias>('RANGE')
  const [bias2h, setBias2h] = useState<Bias>('RANGE')
  const [biasEod, setBiasEod] = useState<Bias>('RANGE')

  const [forecasts, setForecasts] = useState<ForecastRecord[]>(() => loadForecasts())
  const [now, setNow] = useState(Date.now())
  const [lesson, setLesson] = useState<string | null>(null)

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

  useEffect(() => {
    if (liveLtp == null) return
    setForecasts((prev) => {
      let changed = false
      const next = prev.map((f) => {
        if (f.resolved || f.asset !== underlying) return f
        if (now < f.resolveAt) return f
        changed = true
        return evaluateForecast(f, liveLtp)
      })
      if (changed) saveForecasts(next)
      return changed ? next : prev
    })
  }, [now, liveLtp, underlying])

  const spot = liveLtp
  const pad = underlying === 'BANKNIFTY' ? 45 : underlying === 'SENSEX' ? 90 : 22

  const bandFor = (bias: Bias, s: number) => {
    if (bias === 'BULL') return { low: s - pad * 0.5, high: s + pad * 1.6 }
    if (bias === 'BEAR') return { low: s - pad * 1.6, high: s + pad * 0.5 }
    return { low: s - pad, high: s + pad }
  }

  const assetForecasts = useMemo(
    () => forecasts.filter((f) => f.asset === underlying),
    [forecasts, underlying],
  )
  const resolved = assetForecasts.filter((f) => f.resolved)
  const hits = resolved.filter((f) => f.result === 'HIT').length
  const misses = resolved.filter((f) => f.result === 'MISS').length
  const hitRate =
    hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : null
  const pending = assetForecasts.filter((f) => !f.resolved)

  const oh = parseFloat(orbHigh)
  const ol = parseFloat(orbLow)
  const meter = pressureScore(
    spot,
    pending,
    Number.isNaN(oh) ? NaN : oh,
    Number.isNaN(ol) ? NaN : ol,
  )

  const lockForecast = (horizon: Horizon, bias: Bias) => {
    if (!isBridgeLive || spot == null) return
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
      resolveAt: horizonResolveAt(horizon),
      resolved: false,
      result: 'PENDING',
    }
    const next = [rec, ...forecasts]
    setForecasts(next)
    saveForecasts(next)
  }

  const eodLabel =
    Date.now() > today315IstMs() ? '3:15 PM (quick resolve)' : '3:15 PM'

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
    const canLock = isBridgeLive && spot != null
    return (
      <div className="bg-[#0D182E] border border-[#D4AF37]/25 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-[#60A5FA] uppercase tracking-wide">
            {label}
          </span>
          <Target className="w-4 h-4 text-[#60A5FA]" />
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
                      : 'bg-[#60A5FA] text-black border-[#60A5FA]'
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
          disabled={!canLock}
          onClick={() => lockForecast(horizon, bias)}
          className="w-full py-2 rounded-xl text-xs font-bold bg-[#60A5FA] text-[#070E1C] disabled:opacity-40"
        >
          {canLock ? `Lock ${label}` : 'Need LIVE LTP'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-mono">
      {/* TOP: Robot + market meter */}
      <div className="bg-gradient-to-r from-[#0D182E] to-[#12203D] border border-[#D4AF37]/40 rounded-2xl p-4 md:p-5">
        <div className="flex flex-col md:flex-row gap-5 items-center md:items-stretch">
          <div className="shrink-0 flex flex-col items-center gap-2">
            <img
              src="/kd-agent.svg"
              alt="KD's Agent"
              className="w-28 h-36 md:w-32 md:h-40 object-contain drop-shadow-[0_0_20px_rgba(96,165,250,0.35)]"
            />
            <span className="text-[10px] font-bold text-[#60A5FA] tracking-widest uppercase">
              KD&apos;s Agent
            </span>
          </div>

          <div className="flex-1 w-full space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isBridgeLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  <span className="text-[11px] font-bold text-[#60A5FA] uppercase">
                    {isBridgeLive
                      ? `LTP LIVE · ${tickTimestamp} IST`
                      : 'BRIDGE WAITING'}
                  </span>
                  {err ? (
                    <span className="text-[10px] text-amber-200">{err}</span>
                  ) : null}
                </div>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Desk mentor · not SEBI advice · orders only on your broker
                </p>
              </div>
              <div className="flex gap-1.5 bg-[#070E1C] p-1.5 rounded-xl border border-[#D4AF37]/30">
                {(['NIFTY', 'BANKNIFTY', 'SENSEX'] as const).map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => setUnderlying(sym)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      underlying === sym
                        ? 'bg-[#60A5FA] text-[#070E1C]'
                        : 'text-[#94A3B8]'
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            {/* Bullish / Bearish meter beside robot */}
            <div className="bg-[#070E1C] border border-[#D4AF37]/25 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] uppercase text-[#94A3B8]">Market pressure</span>
                <span className={`text-sm font-black ${meter.color}`}>{meter.label}</span>
              </div>
              <div className="h-3 rounded-full bg-[#1E2E4E] overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-500"
                  style={{ width: '100%' }}
                />
              </div>
              <div className="relative h-0">
                <div
                  className="absolute -top-3 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-[#FDFBF7] transition-all duration-500"
                  style={{ left: `calc(${meter.score}% - 8px)` }}
                />
              </div>
              <div className="flex justify-between text-[10px] mt-3 text-[#94A3B8]">
                <span className="flex items-center gap-1 text-rose-400">
                  <TrendingDown className="w-3 h-3" /> Bearish
                </span>
                <span className="flex items-center gap-1 text-amber-300">
                  <Minus className="w-3 h-3" /> Neutral
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <TrendingUp className="w-3 h-3" /> Bullish
                </span>
              </div>
              <div className="mt-2 text-center text-2xl font-bold text-[#FDFBF7]">
                {meter.score}
                <span className="text-xs text-[#94A3B8] ml-1">/ 100</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                <div className="bg-[#0D182E] rounded-lg p-2 border border-[#D4AF37]/15">
                  <div className="text-[#94A3B8] text-[10px]">Spot</div>
                  <div className="font-bold text-[#FDFBF7]">
                    {spot != null
                      ? spot.toLocaleString('en-IN', { maximumFractionDigits: 1 })
                      : '—'}
                  </div>
                </div>
                <div className="bg-[#0D182E] rounded-lg p-2 border border-[#D4AF37]/15">
                  <div className="text-[#94A3B8] text-[10px]">Hit rate</div>
                  <div className="font-bold text-[#60A5FA]">
                    {hitRate != null ? `${hitRate}%` : '—'}
                  </div>
                </div>
                <div className="bg-[#0D182E] rounded-lg p-2 border border-[#D4AF37]/15">
                  <div className="text-[#94A3B8] text-[10px]">Open locks</div>
                  <div className="font-bold text-[#FDFBF7]">{pending.length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Playbook */}
      <div className="flex flex-wrap gap-2">
        {PLAYBOOK.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setLesson(lesson === p.id ? null : p.id)}
            className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold ${
              lesson === p.id
                ? 'bg-[#60A5FA] text-[#070E1C] border-[#60A5FA]'
                : 'border-[#60A5FA]/30 text-[#60A5FA]'
            }`}
          >
            <BookOpen className="w-3 h-3 inline mr-1" />
            {p.title}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void fetchBridgeTicks()}
          className="ml-auto p-1.5 border border-[#D4AF37]/30 rounded-lg text-[#D4AF37]"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setIsLogModalOpen(true)}
          className="px-3 py-1 bg-[#60A5FA] text-[#070E1C] rounded-lg text-[10px] font-bold flex items-center gap-1"
        >
          <PlusCircle className="w-3.5 h-3.5" /> Log trade
        </button>
      </div>
      {lesson && (
        <div className="bg-[#0D182E] border border-[#60A5FA]/30 rounded-xl p-4 text-xs text-[#CBD5E1]">
          <strong className="text-[#60A5FA]">
            {PLAYBOOK.find((x) => x.id === lesson)?.title}:{' '}
          </strong>
          {PLAYBOOK.find((x) => x.id === lesson)?.body}
        </div>
      )}

      {/* ORB row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-3 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">ORB High</span>
          <input
            className="w-full mt-1 bg-[#070E1C] border border-emerald-500/30 rounded px-2 py-1 text-emerald-400 text-sm font-bold"
            value={orbHigh}
            onChange={(e) => setOrbHigh(e.target.value)}
            placeholder="after 9:30"
          />
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-3 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">ORB Low</span>
          <input
            className="w-full mt-1 bg-[#070E1C] border border-rose-500/30 rounded px-2 py-1 text-rose-400 text-sm font-bold"
            value={orbLow}
            onChange={(e) => setOrbLow(e.target.value)}
            placeholder="after 9:30"
          />
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-3 rounded-xl col-span-2">
          <span className="text-[10px] text-[#94A3B8] uppercase block">ORB vs spot</span>
          <span className="text-sm font-bold text-[#FDFBF7]">
            {spot != null && !Number.isNaN(oh) && !Number.isNaN(ol) && oh > ol
              ? spot > oh
                ? 'Above high'
                : spot < ol
                  ? 'Below low'
                  : 'Inside range'
              : 'Set ORB levels'}
          </span>
        </div>
      </div>

      {/* TIMER LOCK SYSTEM */}
      <div>
        <h3 className="text-xs font-bold text-[#60A5FA] uppercase tracking-wider mb-3">
          Horizon lock system
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <MeterCard label="10 min" horizon="10m" bias={bias10} setBias={setBias10} />
          <MeterCard label="30 min" horizon="30m" bias={bias30} setBias={setBias30} />
          <MeterCard label="2 hours" horizon="2h" bias={bias2h} setBias={setBias2h} />
          <MeterCard label={eodLabel} horizon="eod" bias={biasEod} setBias={setBiasEod} />
        </div>
      </div>

      {pending.length > 0 && (
        <div className="bg-[#0D182E] border border-[#D4AF37]/25 rounded-2xl p-4 space-y-2">
          <span className="text-xs font-bold text-[#60A5FA] uppercase flex items-center gap-2">
            <Clock className="w-4 h-4" /> Open locks
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
                  {f.horizon} · {f.bias} · {f.entryLtp.toFixed(1)}
                </span>
                <span className="text-amber-300">
                  {m}:{String(s).padStart(2, '0')}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* REPORT CARD */}
      <div className="bg-[#0D182E] border border-[#D4AF37]/30 rounded-2xl overflow-hidden">
        <div className="p-4 bg-[#12203D] border-b border-[#D4AF37]/20 text-xs font-bold text-[#60A5FA] uppercase">
          Report card — HIT green / MISS red + reason
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070E1C] text-[#94A3B8] border-b border-[#D4AF37]/15">
              <tr>
                <th className="p-3">When</th>
                <th className="p-3">Horizon</th>
                <th className="p-3">Bias</th>
                <th className="p-3">Lock → Exit</th>
                <th className="p-3">Result</th>
                <th className="p-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4AF37]/10 text-[#FDFBF7]">
              {assetForecasts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-[#94A3B8]">
                    Lock a horizon when LTP is LIVE. Results appear after time ends.
                  </td>
                </tr>
              ) : (
                assetForecasts.slice(0, 15).map((f) => (
                  <tr key={f.id}>
                    <td className="p-3 text-[#94A3B8]">
                      {new Date(f.lockedAt).toLocaleTimeString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-3 font-bold text-[#60A5FA]">{f.horizon}</td>
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
                    <td className="p-3 text-[#CBD5E1]">{f.reason || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INDIA CHARTS — NIFTY + SENSEX */}
      <div>
        <h3 className="text-xs font-bold text-[#60A5FA] uppercase tracking-wider mb-3">
          India charts — Nifty &amp; Sensex
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#0D182E] border border-[#D4AF37]/30 p-4 rounded-2xl">
            <div className="flex justify-between mb-2 text-xs">
              <span className="font-bold text-[#FDFBF7] flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#60A5FA]" /> NSE:NIFTY
              </span>
              <span className="text-[#94A3B8]">5m · IST</span>
            </div>
            <div className="w-full h-[400px] rounded-xl overflow-hidden bg-black border border-[#1E2E4E]">
              <iframe
                title="NIFTY"
                className="w-full h-full border-none"
                src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(
                  'NSE:NIFTY',
                )}&interval=5&theme=dark&style=1&timezone=Asia%2FKolkata&hideideas=1`}
              />
            </div>
          </div>
          <div className="bg-[#0D182E] border border-[#D4AF37]/30 p-4 rounded-2xl">
            <div className="flex justify-between mb-2 text-xs">
              <span className="font-bold text-[#FDFBF7] flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#60A5FA]" /> BSE:SENSEX
              </span>
              <span className="text-[#94A3B8]">5m · IST</span>
            </div>
            <div className="w-full h-[400px] rounded-xl overflow-hidden bg-black border border-[#1E2E4E]">
              <iframe
                title="SENSEX"
                className="w-full h-full border-none"
                src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(
                  'BSE:SENSEX',
                )}&interval=5&theme=dark&style=1&timezone=Asia%2FKolkata&hideideas=1`}
              />
            </div>
          </div>
        </div>
        {underlying === 'BANKNIFTY' && (
          <div className="mt-4 bg-[#0D182E] border border-[#D4AF37]/30 p-4 rounded-2xl">
            <div className="text-xs font-bold text-[#FDFBF7] mb-2">NSE:BANKNIFTY</div>
            <div className="w-full h-[320px] rounded-xl overflow-hidden bg-black border border-[#1E2E4E]">
              <iframe
                title="BANKNIFTY"
                className="w-full h-full border-none"
                src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(
                  'NSE:BANKNIFTY',
                )}&interval=5&theme=dark&style=1&timezone=Asia%2FKolkata&hideideas=1`}
              />
            </div>
          </div>
        )}
      </div>

      {/* INDIA NEWS */}
      <div className="bg-[#0D182E] border border-[#D4AF37]/30 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#60A5FA] uppercase">
          <Newspaper className="w-4 h-4" /> Live India market news
        </div>
        <div className="w-full h-[380px] rounded-xl overflow-hidden border border-[#1E2E4E] bg-black">
          <iframe
            title="India news"
            className="w-full h-full border-none"
            src="https://s.tradingview.com/embed-widget/timeline/?locale=en#%7B%22feedMode%22%3A%22symbol%22%2C%22symbol%22%3A%22NSE%3ANIFTY%22%2C%22isTransparent%22%3Atrue%2C%22displayMode%22%3A%22regular%22%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22colorTheme%22%3A%22dark%22%7D"
          />
        </div>
        <div className="flex flex-wrap gap-3 text-[11px]">
          <a
            className="text-[#60A5FA] underline"
            href="https://www.moneycontrol.com/news/business/markets/"
            target="_blank"
            rel="noreferrer"
          >
            Moneycontrol
          </a>
          <a
            className="text-[#60A5FA] underline"
            href="https://www.livemint.com/market"
            target="_blank"
            rel="noreferrer"
          >
            Mint
          </a>
          <a
            className="text-[#60A5FA] underline"
            href="https://economictimes.indiatimes.com/markets"
            target="_blank"
            rel="noreferrer"
          >
            ET Markets
          </a>
          <a
            className="text-[#60A5FA] underline"
            href="https://www.nseindia.com/reports/fii-dii"
            target="_blank"
            rel="noreferrer"
          >
            NSE FII/DII
          </a>
        </div>
      </div>

      {isLogModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0D182E] border-2 border-[#60A5FA] w-full max-w-md rounded-2xl p-6 space-y-3 relative">
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
                    logForm.direction === 'LONG'
                      ? 'bg-emerald-500 text-black'
                      : 'border border-emerald-500/30'
                  }`}
                  onClick={() => setLogForm({ ...logForm, direction: 'LONG' })}
                >
                  LONG
                </button>
                <button
                  type="button"
                  className={`py-2 rounded-lg font-bold ${
                    logForm.direction === 'SHORT'
                      ? 'bg-rose-500 text-black'
                      : 'border border-rose-500/30'
                  }`}
                  onClick={() => setLogForm({ ...logForm, direction: 'SHORT' })}
                >
                  SHORT
                </button>
              </div>
              <input
                className="w-full bg-[#070E1C] border border-[#60A5FA]/30 rounded-lg p-2 text-[#FDFBF7]"
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
                className="w-full bg-[#070E1C] border border-[#60A5FA]/30 rounded-lg p-2 text-[#FDFBF7]"
                placeholder="Target"
                value={logForm.target}
                onChange={(e) => setLogForm({ ...logForm, target: e.target.value })}
              />
              <button
                type="submit"
                className="w-full bg-[#60A5FA] text-[#070E1C] font-bold py-2 rounded-lg"
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
    <div className="space-y-4 font-mono">
      <form onSubmit={handleSearch} className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-3 text-[#60A5FA]" />
        <input
          className="w-full bg-[#0D182E] border border-[#60A5FA]/40 rounded-xl pl-9 pr-20 py-2.5 text-xs text-[#FDFBF7]"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="NSE symbol"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1.5 bg-[#60A5FA] text-[#070E1C] px-3 py-1 rounded-lg text-xs font-bold"
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
      className="text-[#60A5FA] underline text-xs"
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
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">India market news</h2>
    <div className="h-[520px] rounded-2xl overflow-hidden border border-[#D4AF37]/30 bg-black">
      <iframe
        title="India news"
        className="w-full h-full border-none"
        src="https://s.tradingview.com/embed-widget/timeline/?locale=en#%7B%22feedMode%22%3A%22symbol%22%2C%22symbol%22%3A%22NSE%3ANIFTY%22%2C%22isTransparent%22%3Atrue%2C%22displayMode%22%3A%22regular%22%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22colorTheme%22%3A%22dark%22%7D"
      />
    </div>
    <div className="flex flex-wrap gap-3 text-[11px]">
      <a
        className="text-[#60A5FA] underline"
        href="https://www.moneycontrol.com/news/business/markets/"
        target="_blank"
        rel="noreferrer"
      >
        Moneycontrol
      </a>
      <a
        className="text-[#60A5FA] underline"
        href="https://www.livemint.com/market"
        target="_blank"
        rel="noreferrer"
      >
        Mint
      </a>
      <a
        className="text-[#60A5FA] underline"
        href="https://economictimes.indiatimes.com/markets"
        target="_blank"
        rel="noreferrer"
      >
        ET Markets
      </a>
    </div>
  </div>
)

export const SectorEtfMatrix: React.FC = () => (
  <div className="font-mono text-sm text-[#CBD5E1]">
    Use Screener for ETF symbols (e.g. SILVERBEES).
  </div>
)

export const RiskProtocolDesk: React.FC = () => (
  <div className="grid md:grid-cols-3 gap-4 text-xs text-[#CBD5E1] font-mono">
    <div className="bg-[#0D182E] border border-[#D4AF37]/25 p-5 rounded-2xl">
      <ShieldAlert className="w-4 h-4 text-[#60A5FA] mb-2" /> Fixed % risk
    </div>
    <div className="bg-[#0D182E] border border-[#D4AF37]/25 p-5 rounded-2xl">
      <Activity className="w-4 h-4 text-amber-300 mb-2" /> No lock without LIVE LTP
    </div>
    <div className="bg-[#0D182E] border border-[#D4AF37]/25 p-5 rounded-2xl">
      <Zap className="w-4 h-4 text-emerald-400 mb-2" /> Broker confirms orders
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
