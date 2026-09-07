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
} from 'lucide-react'

const BRIDGE_URL = String(
  (import.meta as any).env?.VITE_ANGEL_BRIDGE_URL || '',
).replace(/\/$/, '')

const FORECAST_KEY = 'novaforge_kd_forecast_v2'
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
  agentNote?: string
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
    title: 'Opening Range (ORB)',
    body: 'First 15 minutes (9:15–9:30 IST) set the opening range. Mark high/low after 9:30. Break + hold above high with volume = bullish structure interest; break below low = bearish. Fake breaks are common — wait for a retest when unsure.',
  },
  {
    id: 'vwap',
    title: 'VWAP discipline',
    body: 'VWAP is an average price anchor for the session (visible on chart studies). Sustained trade above VWAP often supports long bias for intraday; below supports short bias. A close back through VWAP against your position is a classic invalidation cue — not a guarantee.',
  },
  {
    id: 'invalidation',
    title: 'Invalidation first',
    body: 'Before entry, write the price that proves you wrong. If hit, exit — no averaging down on intraday options. Size so that stop loss is a small fixed % of capital.',
  },
  {
    id: 'session',
    title: 'Session clock (IST)',
    body: '9:15–9:45: volatility high, wider stops. 10:00–14:00: often cleaner structure. 14:30–15:15: positioning into close; 3:15 PM is cash equity close — square off or accept overnight risk only if planned.',
  },
  {
    id: 'rr',
    title: 'Risk : Reward',
    body: 'Prefer setups where target is at least ~1.5–2.5× the stop distance. If R:R is poor, skip even if direction feels right.',
  },
  {
    id: 'notrade',
    title: 'When KD says WAIT',
    body: 'No live LTP feed, unclear level, mid-range chop with no ORB context, or you already hit daily loss limit — WAIT is a valid professional outcome.',
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

/** Timestamp for today 15:15:00 IST */
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
  // past 3:15 — resolve in 2 minutes so user can still test scorecard
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
      : `Range break: exit ${exitLtp.toFixed(1)} outside ${f.low.toFixed(1)}–${f.high.toFixed(1)}`
  } else if (f.bias === 'BULL') {
    if (exitLtp < f.low) {
      result = 'MISS'
      reason = `Bull invalidated below ${f.low.toFixed(1)} (exit ${exitLtp.toFixed(1)})`
    } else if (exitLtp >= f.entryLtp) {
      result = 'HIT'
      reason = `Bull drift: ${f.entryLtp.toFixed(1)} → ${exitLtp.toFixed(1)}`
    } else {
      result = 'MISS'
      reason = `Bull failed: exit ${exitLtp.toFixed(1)} below lock ${f.entryLtp.toFixed(1)}`
    }
  } else {
    if (exitLtp > f.high) {
      result = 'MISS'
      reason = `Bear invalidated above ${f.high.toFixed(1)} (exit ${exitLtp.toFixed(1)})`
    } else if (exitLtp <= f.entryLtp) {
      result = 'HIT'
      reason = `Bear drift: ${f.entryLtp.toFixed(1)} → ${exitLtp.toFixed(1)}`
    } else {
      result = 'MISS'
      reason = `Bear failed: exit ${exitLtp.toFixed(1)} above lock ${f.entryLtp.toFixed(1)}`
    }
  }

  return { ...f, resolved: true, exitLtp, result, reason }
}

function agentAdvice(opts: {
  live: boolean
  spot: number | null
  underlying: string
  pending: number
  hitRate: number | null
}): string {
  if (!opts.live) {
    return 'KD’s Agent: Feed not LIVE. I will not lock a call until Angel LTP is green. Use the chart only for structure — no forced trades.'
  }
  if (opts.spot == null) {
    return 'KD’s Agent: Waiting for a clean LTP tick…'
  }
  if (opts.pending > 2) {
    return `KD’s Agent: You already have ${opts.pending} open calls on ${opts.underlying}. Let them resolve before stacking more bias.`
  }
  if (opts.hitRate != null && opts.hitRate < 40 && opts.hitRate >= 0) {
    return `KD’s Agent: Recent hit rate ${opts.hitRate}%. Size down, demand clearer invalidation, or WAIT. Protect capital first.`
  }
  return `KD’s Agent: ${opts.underlying} at ${opts.spot.toFixed(1)}. Pick a horizon, choose BULL / RANGE / BEAR, lock only if your stop is defined. I score honesty — not hope.`
}

// =========================================================================
// KD'S AGENT + F&O DESK
// =========================================================================
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
      agentNote: `KD locked ${horizon} ${bias} on ${underlying}`,
    }
    const next = [rec, ...forecasts]
    setForecasts(next)
    saveForecasts(next)
  }

  const advice = agentAdvice({
    live: isBridgeLive,
    spot,
    underlying,
    pending: pending.length,
    hitRate,
  })

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

  const eodLabel = (() => {
    const t = today315IstMs()
    if (Date.now() > t) return '3:15 PM (past — quick resolve)'
    return '3:15 PM IST'
  })()

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
          disabled={!canLock}
          onClick={() => lockForecast(horizon, bias)}
          className="w-full py-2 rounded-xl text-xs font-bold bg-[#D4AF37] text-[#070E1C] disabled:opacity-40"
        >
          {canLock ? `KD lock ${horizon}` : 'Need LIVE LTP'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-mono">
      {/* KD'S AGENT HEADER */}
      <div className="bg-gradient-to-r from-[#12203D] to-[#0D182E] border border-[#D4AF37]/40 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative shrink-0">
          <img
            src="/kd-agent.svg"
            alt="KD's Agent"
            className="w-20 h-20 rounded-full border-2 border-[#D4AF37] shadow-[0_0_24px_rgba(212,175,55,0.35)] bg-[#070E1C]"
          />
          <span
            className={`absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0D182E] ${
              isBridgeLive ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-serif font-black text-[#FDFBF7] tracking-wide">
              KD&apos;s Agent
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#D4AF37]/40 text-[#D4AF37] font-bold">
              DESK MENTOR · NOT SEBI ADVICE
            </span>
          </div>
          <p className="text-xs text-[#CBD5E1] leading-relaxed">{advice}</p>
          <p className="text-[10px] text-[#64748B]">
            Horizons: 10m · 30m · 2h · {eodLabel}. Scorecard uses later live LTP.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] text-[#94A3B8] uppercase">Agent hit rate</div>
          <div className="text-2xl font-bold text-[#FDFBF7]">
            {hitRate != null ? `${hitRate}%` : '—'}
          </div>
          <div className="text-[10px] text-[#94A3B8]">
            {hits} hit · {misses} miss
          </div>
        </div>
      </div>

      {/* Playbook chips */}
      <div className="flex flex-wrap gap-2">
        {PLAYBOOK.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setLesson(lesson === p.id ? null : p.id)}
            className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold ${
              lesson === p.id
                ? 'bg-[#D4AF37] text-[#070E1C] border-[#D4AF37]'
                : 'border-[#D4AF37]/25 text-[#D4AF37] hover:bg-[#D4AF37]/10'
            }`}
          >
            <BookOpen className="w-3 h-3 inline mr-1" />
            {p.title}
          </button>
        ))}
      </div>
      {lesson && (
        <div className="bg-[#0D182E] border border-[#D4AF37]/30 rounded-xl p-4 text-xs text-[#CBD5E1] leading-relaxed">
          <strong className="text-[#D4AF37]">
            {PLAYBOOK.find((p) => p.id === lesson)?.title}:{' '}
          </strong>
          {PLAYBOOK.find((p) => p.id === lesson)?.body}
        </div>
      )}

      {/* Controls */}
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
          <p className="text-xs text-[#94A3B8]">Index desk powered by KD&apos;s Agent</p>
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
          <span className="text-[10px] text-[#94A3B8] uppercase block">ORB</span>
          <span className={`text-sm font-bold ${orbStatus.color}`}>{orbStatus.text}</span>
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase block">Open KD calls</span>
          <span className="text-2xl font-bold text-[#FDFBF7]">{pending.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MeterCard label="Next 10 min" horizon="10m" bias={bias10} setBias={setBias10} />
        <MeterCard label="Next 30 min" horizon="30m" bias={bias30} setBias={setBias30} />
        <MeterCard label="Next 2 hours" horizon="2h" bias={bias2h} setBias={setBias2h} />
        <MeterCard label={eodLabel} horizon="eod" bias={biasEod} setBias={setBiasEod} />
      </div>

      {pending.length > 0 && (
        <div className="bg-[#0D182E] border border-[#D4AF37]/25 rounded-2xl p-4 space-y-2">
          <span className="text-xs font-bold text-[#D4AF37] uppercase flex items-center gap-2">
            <Clock className="w-4 h-4" /> KD open calls
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
                  {m}:{String(s).padStart(2, '0')} left
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className="bg-[#0D182E] border border-[#D4AF37]/30 rounded-2xl overflow-hidden">
        <div className="p-4 bg-[#12203D] border-b border-[#D4AF37]/20 text-xs font-bold text-[#D4AF37] uppercase">
          KD&apos;s Agent report card (HIT green / MISS red + reason)
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
              {assetForecasts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-[#94A3B8]">
                    Lock a KD call when LTP is LIVE. Results appear after the horizon ends.
                  </td>
                </tr>
              ) : (
                assetForecasts.slice(0, 15).map((f) => (
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

      <div className="bg-[#0D182E] border border-[#D4AF37]/30 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#D4AF37] uppercase">
          <Newspaper className="w-4 h-4" /> Market news timeline
        </div>
        <div className="w-full h-[380px] rounded-xl overflow-hidden border border-[#1E2E4E] bg-black">
          <iframe
            title="news"
            className="w-full h-full border-none"
            src="https://s.tradingview.com/embed-widget/timeline/?locale=en#%7B%22feedMode%22%3A%22all_symbols%22%2C%22isTransparent%22%3Atrue%2C%22displayMode%22%3A%22regular%22%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22colorTheme%22%3A%22dark%22%7D"
          />
        </div>
      </div>

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
              <button
                type="submit"
                className="w-full bg-[#D4AF37] text-[#070E1C] font-bold py-2 rounded-lg"
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
  <div className="font-mono text-sm text-[#CBD5E1]">Use Screener for ETF symbols (e.g. SILVERBEES).</div>
)

export const RiskProtocolDesk: React.FC = () => (
  <div className="grid md:grid-cols-3 gap-4 text-xs text-[#CBD5E1] font-mono">
    <div className="bg-[#0D182E] border border-[#D4AF37]/25 p-5 rounded-2xl">
      <ShieldAlert className="w-4 h-4 text-[#D4AF37] mb-2" /> Fixed % risk · KD agrees
    </div>
    <div className="bg-[#0D182E] border border-[#D4AF37]/25 p-5 rounded-2xl">
      <Activity className="w-4 h-4 text-amber-300 mb-2" /> No lock without LIVE LTP
    </div>
    <div className="bg-[#0D182E] border border-[#D4AF37]/25 p-5 rounded-2xl">
      <Zap className="w-4 h-4 text-emerald-400 mb-2" /> Broker confirms every order
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
