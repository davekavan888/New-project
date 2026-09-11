import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Search,
  BarChart2,
  ShieldAlert,
  Activity,
  Zap,
  RefreshCw,
  Clock,
  Target,
  CheckCircle2,
  XCircle,
  Newspaper,
  BookOpen,
  History,
  AlertTriangle,
  Atom,
  Award,
} from 'lucide-react'

const BRIDGE_URL = String(
  (import.meta as any).env?.VITE_ANGEL_BRIDGE_URL || '',
).replace(/\/$/, '')

const FORECAST_KEY = 'novaforge_forecast_v5'
const ORB_KEY = 'novaforge_orb_v1'
const MAX_WORKING_DAYS = 5
const MAX_TICKS = 24

type Horizon = '5m' | '10m' | '15m' | '30m'
type Bias = 'BULL' | 'BEAR' | 'RANGE'
type Asset = 'NIFTY' | 'BANKNIFTY' | 'SENSEX'
type SessionPhase =
  | 'PRE'
  | 'ORB'
  | 'MORNING'
  | 'MID'
  | 'AFTERNOON'
  | 'CLOSING'
  | 'CLOSED'
  | 'WEEKEND'

interface ForecastRecord {
  id: string
  asset: Asset
  horizon: Horizon
  bias: Bias
  side: 'CALL' | 'PUT' | 'NONE'
  entryLtp: number
  low: number
  high: number
  lockedAt: number
  resolveAt: number
  dayKey: string
  resolved: boolean
  exitLtp?: number
  result?: 'HIT' | 'MISS' | 'PENDING'
  reason?: string
}

interface Tick {
  t: number
  px: number
}

/** TradingView advanced chart — correct NSE/BSE symbols */
export const RealTradingViewChart: React.FC<{ symbol: string; height?: number }> = ({
  symbol,
  height = 420,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(`tv_${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.innerHTML = ''
    const widget = document.createElement('div')
    widget.className = 'tradingview-widget-container__widget'
    widget.style.height = `${height}px`
    widget.style.width = '100%'
    el.appendChild(widget)
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: '5',
      timezone: 'Asia/Kolkata',
      theme: 'dark',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      studies: ['STD;VWAP', 'STD;RSI'],
      support_host: 'https://www.tradingview.com',
    })
    el.appendChild(script)
    return () => {
      el.innerHTML = ''
    }
  }, [symbol, height])

  return (
    <div
      id={idRef.current}
      className="tradingview-widget-container w-full"
      ref={containerRef}
      style={{ height: `${height}px` }}
    />
  )
}

function istParts(d = new Date()) {
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false,
  })
  const o: Record<string, string> = {}
  for (const p of dtf.formatToParts(d)) {
    if (p.type !== 'literal') o[p.type] = p.value
  }
  return o
}

function dayKeyIST(ts = Date.now()) {
  const p = istParts(new Date(ts))
  return `${p.year}-${p.month}-${p.day}`
}

function isWeekendKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d, 6, 0, 0))
  return ['Sat', 'Sun'].includes(istParts(utc).weekday)
}

function sessionPhase(now = Date.now()): SessionPhase {
  const p = istParts(new Date(now))
  if (p.weekday === 'Sat' || p.weekday === 'Sun') return 'WEEKEND'
  const mins = Number(p.hour) * 60 + Number(p.minute)
  if (mins < 9 * 60 + 15) return 'PRE'
  if (mins < 9 * 60 + 30) return 'ORB'
  if (mins < 11 * 60 + 30) return 'MORNING'
  if (mins < 13 * 60 + 30) return 'MID'
  if (mins < 15 * 60) return 'AFTERNOON'
  if (mins < 15 * 60 + 30) return 'CLOSING'
  return 'CLOSED'
}

function horizonMs(h: Horizon) {
  if (h === '5m') return 5 * 60 * 1000
  if (h === '10m') return 10 * 60 * 1000
  if (h === '15m') return 15 * 60 * 1000
  return 30 * 60 * 1000
}

function biasToSide(b: Bias): 'CALL' | 'PUT' | 'NONE' {
  if (b === 'BULL') return 'CALL'
  if (b === 'BEAR') return 'PUT'
  return 'NONE'
}

function parseLtpBag(data: any): Partial<Record<Asset, number>> {
  const out: Partial<Record<Asset, number>> = {}
  if (!data) return out
  const tryNum = (v: any) => {
    const n = Number(v)
    return n > 0 ? n : null
  }
  if (data.ltp && typeof data.ltp === 'object') {
    for (const k of ['NIFTY', 'BANKNIFTY', 'SENSEX'] as Asset[]) {
      const n = tryNum(data.ltp[k])
      if (n) out[k] = n
    }
  }
  const n1 = tryNum(data.nifty?.ltp ?? data.NIFTY?.ltp)
  const n2 = tryNum(data.bankNifty?.ltp ?? data.BANKNIFTY?.ltp)
  if (n1) out.NIFTY = out.NIFTY ?? n1
  if (n2) out.BANKNIFTY = out.BANKNIFTY ?? n2
  return out
}

function evaluateForecast(f: ForecastRecord, exitLtp: number): ForecastRecord {
  let result: 'HIT' | 'MISS' = 'MISS'
  let reason = ''
  const move = exitLtp - f.entryLtp
  if (f.bias === 'RANGE') {
    const inBand = exitLtp >= f.low && exitLtp <= f.high
    result = inBand ? 'HIT' : 'MISS'
    reason = inBand
      ? `RANGE HIT: held ${f.low.toFixed(1)}–${f.high.toFixed(1)}`
      : `RANGE MISS: exit ${exitLtp.toFixed(1)} left band`
  } else if (f.bias === 'BULL') {
    if (exitLtp < f.low) {
      result = 'MISS'
      reason = `CALL MISS: broke inv ${f.low.toFixed(1)} → ${exitLtp.toFixed(1)}`
    } else if (exitLtp > f.entryLtp) {
      result = 'HIT'
      reason = `CALL HIT: +${move.toFixed(1)} (${f.entryLtp.toFixed(1)}→${exitLtp.toFixed(1)})`
    } else {
      result = 'MISS'
      reason = `CALL MISS: no upside (${f.entryLtp.toFixed(1)}→${exitLtp.toFixed(1)})`
    }
  } else {
    if (exitLtp > f.high) {
      result = 'MISS'
      reason = `PUT MISS: broke inv ${f.high.toFixed(1)} → ${exitLtp.toFixed(1)}`
    } else if (exitLtp < f.entryLtp) {
      result = 'HIT'
      reason = `PUT HIT: ${move.toFixed(1)} (${f.entryLtp.toFixed(1)}→${exitLtp.toFixed(1)})`
    } else {
      result = 'MISS'
      reason = `PUT MISS: no downside (${f.entryLtp.toFixed(1)}→${exitLtp.toFixed(1)})`
    }
  }
  return { ...f, resolved: true, exitLtp, result, reason }
}

function loadAll(): ForecastRecord[] {
  try {
    const s = localStorage.getItem(FORECAST_KEY)
    if (s) return JSON.parse(s)
    const old = localStorage.getItem('novaforge_forecast_v4')
    if (old) {
      localStorage.setItem(FORECAST_KEY, old)
      return JSON.parse(old)
    }
    return []
  } catch {
    return []
  }
}

function pruneWorkingDays(rows: ForecastRecord[]): ForecastRecord[] {
  const keys = [...new Set(rows.map((r) => r.dayKey))]
    .filter((k) => !isWeekendKey(k))
    .sort()
  const keep = new Set(keys.slice(-MAX_WORKING_DAYS))
  return rows.filter((r) => keep.has(r.dayKey) || keys.length < MAX_WORKING_DAYS)
}

function saveAll(rows: ForecastRecord[]) {
  const pruned = pruneWorkingDays(rows).slice(0, 600)
  try {
    localStorage.setItem(FORECAST_KEY, JSON.stringify(pruned))
  } catch {
    /* */
  }
  return pruned
}

function momentumFromTicks(ticks: Tick[]) {
  if (ticks.length < 3) return { delta: 0, label: 'thin tape' }
  const delta = ticks[ticks.length - 1].px - ticks[0].px
  if (Math.abs(delta) < 5) return { delta, label: 'flat tape' }
  if (delta > 15) return { delta, label: 'strong upticks' }
  if (delta > 5) return { delta, label: 'mild upticks' }
  if (delta < -15) return { delta, label: 'strong downticks' }
  return { delta, label: 'mild downticks' }
}

function buildMentor(args: {
  phase: SessionPhase
  live: boolean
  spot: number | null
  asset: Asset
  orbH: number | null
  orbL: number | null
  mom: { delta: number; label: string }
  pending: ForecastRecord[]
  hitRate: number | null
  suggested: Bias
}): string {
  const { phase, live, spot, asset, orbH, orbL, mom, pending, hitRate, suggested } = args
  if (!live || spot == null) {
    return 'KD Agent: No LIVE LTP. Do not lock until bridge is green.'
  }
  if (phase === 'WEEKEND' || phase === 'CLOSED' || phase === 'PRE') {
    return `KD Agent: Phase ${phase}. Prep only — no live session locks.`
  }
  if (phase === 'ORB') {
    return 'KD Agent: ORB window 9:15–9:30. Mark high/low. Prefer WAIT until after 9:30 hold.'
  }
  const parts = [
    `KD Agent · ${asset} @ ${spot.toFixed(1)} · ${phase} · tape: ${mom.label}.`,
  ]
  if (orbH != null && orbL != null && orbH > orbL) {
    if (spot > orbH) parts.push(`Above ORB high ${orbH.toFixed(1)}.`)
    else if (spot < orbL) parts.push(`Below ORB low ${orbL.toFixed(1)}.`)
    else parts.push(`Inside ORB ${orbL.toFixed(1)}–${orbH.toFixed(1)}.`)
  } else {
    parts.push('Set ORB high/low after 9:30 for better context.')
  }
  if (suggested === 'BULL') parts.push('Lean: CALL bias on short horizons if tape agrees.')
  else if (suggested === 'BEAR') parts.push('Lean: PUT bias on short horizons if tape agrees.')
  else parts.push('Lean: WAIT / RANGE — no forced side.')
  if (pending.length) parts.push(`${pending.length} open lock(s).`)
  if (hitRate != null) parts.push(`Today accuracy: ${hitRate}%.`)
  if (phase === 'MID') parts.push('Mid-session chop risk.')
  if (phase === 'CLOSING') parts.push('Closing noise — prefer no new aggression.')
  parts.push('Not advice. Confirm on broker.')
  return parts.join(' ')
}

// ===================== REAL 5-DAY HISTORY =====================
export const HistoricalReportDesk: React.FC = () => {
  const [rows, setRows] = useState<ForecastRecord[]>(() => loadAll())
  const [day, setDay] = useState(() => dayKeyIST())

  useEffect(() => {
    const id = setInterval(() => setRows(loadAll()), 2000)
    return () => clearInterval(id)
  }, [])

  const dayKeys = useMemo(() => {
    return [...new Set(rows.map((r) => r.dayKey))].sort().reverse().slice(0, MAX_WORKING_DAYS)
  }, [rows])

  const dayRows = rows.filter((r) => r.dayKey === day).sort((a, b) => b.lockedAt - a.lockedAt)
  const hits = dayRows.filter((r) => r.result === 'HIT').length
  const misses = dayRows.filter((r) => r.result === 'MISS').length
  const pending = dayRows.filter((r) => !r.resolved).length
  const rate = hits + misses ? Math.round((hits / (hits + misses)) * 100) : null

  const exportCsv = () => {
    const header = 'day,time,asset,horizon,side,entry,exit,result,reason\n'
    const lines = dayRows.map((f) => {
      const t = new Date(f.lockedAt).toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      return [
        f.dayKey,
        t,
        f.asset,
        f.horizon,
        f.side,
        f.entryLtp,
        f.exitLtp ?? '',
        f.result ?? '',
        `"${(f.reason || '').replace(/"/g, '')}"`,
      ].join(',')
    })
    const blob = new Blob([header + lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `novaforge-${day}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5 font-mono">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#FDFBF7] flex items-center gap-2">
            <Award className="w-5 h-5 text-[#D4AF37]" /> Real 5-day report card
          </h2>
          <p className="text-xs text-[#94A3B8]">Your locks only — not demo numbers</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(dayKeys.length ? dayKeys : [dayKeyIST()]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setDay(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                day === k
                  ? 'bg-[#D4AF37] text-[#070E1C] border-[#D4AF37]'
                  : 'border-[#D4AF37]/25 text-[#94A3B8]'
              }`}
            >
              {k}
            </button>
          ))}
          <button
            type="button"
            onClick={exportCsv}
            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-[#D4AF37]/40 text-[#D4AF37]"
          >
            Export CSV
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <div className="text-[10px] text-[#94A3B8]">ENTRIES</div>
          <div className="text-2xl font-bold text-[#FDFBF7]">{dayRows.length}</div>
        </div>
        <div className="bg-[#0D182E] border border-emerald-500/30 p-4 rounded-xl">
          <div className="text-[10px] text-[#94A3B8]">HIT</div>
          <div className="text-2xl font-bold text-emerald-400">{hits}</div>
        </div>
        <div className="bg-[#0D182E] border border-rose-500/30 p-4 rounded-xl">
          <div className="text-[10px] text-[#94A3B8]">MISS</div>
          <div className="text-2xl font-bold text-rose-400">{misses}</div>
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/30 p-4 rounded-xl">
          <div className="text-[10px] text-[#94A3B8]">ACCURACY</div>
          <div className="text-2xl font-bold text-[#D4AF37]">{rate != null ? `${rate}%` : '—'}</div>
          {pending > 0 && <div className="text-[10px] text-amber-300">{pending} pending</div>}
        </div>
      </div>
      <div className="bg-[#0D182E] border border-[#D4AF37]/30 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070E1C] text-[#94A3B8] sticky top-0">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Asset</th>
                <th className="p-3">H</th>
                <th className="p-3">Side</th>
                <th className="p-3">Lock → Exit</th>
                <th className="p-3">Result</th>
                <th className="p-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4AF37]/10 text-[#FDFBF7]">
              {dayRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-[#94A3B8]">
                    No real locks this day. Use F&amp;O desk to lock.
                  </td>
                </tr>
              ) : (
                dayRows.map((f) => (
                  <tr key={f.id}>
                    <td className="p-3 text-[#94A3B8]">
                      {new Date(f.lockedAt).toLocaleTimeString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="p-3 font-bold">{f.asset}</td>
                    <td className="p-3 text-[#D4AF37] font-bold">{f.horizon}</td>
                    <td className="p-3">
                      {f.side === 'CALL' ? (
                        <span className="text-emerald-400 font-bold">CALL</span>
                      ) : f.side === 'PUT' ? (
                        <span className="text-rose-400 font-bold">PUT</span>
                      ) : (
                        <span className="text-amber-300">—</span>
                      )}
                    </td>
                    <td className="p-3 font-mono">
                      {f.entryLtp.toFixed(1)}
                      {f.exitLtp != null ? ` → ${f.exitLtp.toFixed(1)}` : ' → …'}
                    </td>
                    <td className="p-3">
                      {f.result === 'HIT' ? (
                        <span className="text-emerald-400 font-bold">HIT</span>
                      ) : f.result === 'MISS' ? (
                        <span className="text-rose-400 font-bold">MISS</span>
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
    </div>
  )
}

// ===================== MAIN F&O DESK =====================
export const FoDecisionDesk: React.FC = () => {
  const [underlying, setUnderlying] = useState<Asset>('NIFTY')
  const [ltpMap, setLtpMap] = useState<Partial<Record<Asset, number>>>({})
  const [ticks, setTicks] = useState<Tick[]>([])
  const [isBridgeLive, setIsBridgeLive] = useState(false)
  const [tickTimestamp, setTickTimestamp] = useState('--:--:--')
  const [err, setErr] = useState('')
  const [phase, setPhase] = useState<SessionPhase>(() => sessionPhase())
  const [bias5, setBias5] = useState<Bias>('RANGE')
  const [bias10, setBias10] = useState<Bias>('RANGE')
  const [bias15, setBias15] = useState<Bias>('RANGE')
  const [bias30, setBias30] = useState<Bias>('RANGE')
  const [forecasts, setForecasts] = useState<ForecastRecord[]>(() => loadAll())
  const [now, setNow] = useState(Date.now())
  const [lesson, setLesson] = useState<string | null>(null)
  const [orbHigh, setOrbHigh] = useState('')
  const [orbLow, setOrbLow] = useState('')
  const orbLoaded = useRef(false)

  useEffect(() => {
    if (orbLoaded.current) return
    orbLoaded.current = true
    try {
      const s = localStorage.getItem(ORB_KEY)
      if (s) {
        const o = JSON.parse(s)
        if (o.day === dayKeyIST()) {
          if (o.high) setOrbHigh(String(o.high))
          if (o.low) setOrbLow(String(o.low))
        }
      }
    } catch {
      /* */
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        ORB_KEY,
        JSON.stringify({ day: dayKeyIST(), high: orbHigh, low: orbLow }),
      )
    } catch {
      /* */
    }
  }, [orbHigh, orbLow])

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
      const map = parseLtpBag(data)
      if (Object.keys(map).length) {
        setLtpMap(map)
        setIsBridgeLive(true)
        setTickTimestamp(
          new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
        )
        setErr('')
        const px = map[underlying] ?? (underlying === 'SENSEX' ? map.NIFTY : undefined)
        if (px != null) {
          setTicks((prev) => [...prev, { t: Date.now(), px }].slice(-MAX_TICKS))
        }
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
    const id = setInterval(() => {
      setNow(Date.now())
      setPhase(sessionPhase())
    }, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setForecasts((prev) => {
      let changed = false
      const next = prev.map((f) => {
        if (f.resolved || now < f.resolveAt) return f
        const px = ltpMap[f.asset] ?? (f.asset === 'SENSEX' ? ltpMap.NIFTY : undefined)
        if (px == null) return f
        changed = true
        return evaluateForecast(f, px)
      })
      return changed ? saveAll(next) : prev
    })
  }, [now, ltpMap])

  const spot =
    ltpMap[underlying] ?? (underlying === 'SENSEX' ? ltpMap.NIFTY ?? null : null) ?? null

  const basePad = underlying === 'BANKNIFTY' ? 40 : underlying === 'SENSEX' ? 80 : 18
  /** Different width per horizon so 5m ≠ 10m ≠ 15m ≠ 30m */
  const horizonPad = (h: Horizon) => {
    const m = h === '5m' ? 0.55 : h === '10m' ? 0.85 : h === '15m' ? 1.15 : 1.55
    return basePad * m
  }
  const bandFor = (bias: Bias, s: number, h: Horizon) => {
    const pad = horizonPad(h)
    if (bias === 'BULL') return { low: s - pad * 0.4, high: s + pad * 1.2 }
    if (bias === 'BEAR') return { low: s - pad * 1.2, high: s + pad * 0.4 }
    return { low: s - pad * 0.65, high: s + pad * 0.65 }
  }

  const oh = parseFloat(orbHigh)
  const ol = parseFloat(orbLow)
  const orbH = !Number.isNaN(oh) ? oh : null
  const orbL = !Number.isNaN(ol) ? ol : null
  const mom = momentumFromTicks(ticks)

  const suggestedBias: Bias = useMemo(() => {
    if (['ORB', 'PRE', 'CLOSED', 'WEEKEND'].includes(phase)) return 'RANGE'
    let score = 0
    if (spot != null && orbH != null && orbL != null && orbH > orbL) {
      if (spot > orbH) score += 2
      else if (spot < orbL) score -= 2
    }
    if (mom.delta > 12) score += 1
    else if (mom.delta < -12) score -= 1
    if ((phase === 'MID' || phase === 'CLOSING') && Math.abs(score) < 2) return 'RANGE'
    if (score >= 2) return 'BULL'
    if (score <= -2) return 'BEAR'
    return 'RANGE'
  }, [phase, spot, orbH, orbL, mom.delta])

  const applyLean = () => {
    setBias5(suggestedBias)
    setBias10(suggestedBias)
    setBias15(suggestedBias)
    setBias30(suggestedBias)
  }

  const todayKey = dayKeyIST()
  const todayRows = useMemo(
    () => forecasts.filter((f) => f.dayKey === todayKey),
    [forecasts, todayKey],
  )
  const hits = todayRows.filter((f) => f.result === 'HIT').length
  const misses = todayRows.filter((f) => f.result === 'MISS').length
  const pending = todayRows.filter((f) => !f.resolved)
  const hitRate = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : null
  const canTrade =
    phase === 'MORNING' ||
    phase === 'MID' ||
    phase === 'AFTERNOON' ||
    phase === 'CLOSING'

  const lockForecast = (horizon: Horizon, bias: Bias) => {
    if (!isBridgeLive || spot == null) {
      setErr('Need LIVE LTP')
      return
    }
    if (!canTrade) {
      // warn but still allow lock if user insists during live tape
      console.warn('Phase', phase, '— prefer observe')
    }
    if (forecasts.some((f) => !f.resolved && f.asset === underlying && f.horizon === horizon)) {
      setErr(`Open ${horizon} lock already on ${underlying}`)
      return
    }
    if (pending.length >= 4) {
      setErr('Max 4 open locks')
      return
    }
    const { low, high } = bandFor(bias, spot, horizon)
    const rec: ForecastRecord = {
      id: `${Date.now()}-${horizon}-${underlying}`,
      asset: underlying,
      horizon,
      bias,
      side: biasToSide(bias),
      entryLtp: spot,
      low,
      high,
      lockedAt: Date.now(),
      resolveAt: Date.now() + horizonMs(horizon),
      dayKey: dayKeyIST(),
      resolved: false,
      result: 'PENDING',
    }
    setForecasts(saveAll([rec, ...forecasts]))
    setErr('')
  }

  let meterScore = 50
  if (spot != null && orbH != null && orbL != null && orbH > orbL) {
    if (spot > orbH) meterScore += 22
    else if (spot < orbL) meterScore -= 22
    else meterScore += ((spot - orbL) / (orbH - orbL) - 0.5) * 26
  }
  meterScore += Math.max(-12, Math.min(12, mom.delta * 0.4))
  meterScore = Math.max(0, Math.min(100, Math.round(meterScore)))
  const sideHint = meterScore >= 62 ? 'CALL' : meterScore <= 38 ? 'PUT' : 'WAIT'
  const meterColor =
    sideHint === 'CALL' ? 'text-emerald-400' : sideHint === 'PUT' ? 'text-rose-400' : 'text-amber-300'

  const mentorText = buildMentor({
    phase,
    live: isBridgeLive,
    spot,
    asset: underlying,
    orbH,
    orbL,
    mom,
    pending,
    hitRate,
    suggested: suggestedBias,
  })

  const chartSymbol =
    underlying === 'SENSEX' ? 'BSE:SENSEX' : `NSE:${underlying === 'BANKNIFTY' ? 'BANKNIFTY' : 'NIFTY'}`

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
    const b = spot != null ? bandFor(bias, spot, horizon) : null
    const canLock = isBridgeLive && spot != null
    const side = biasToSide(bias)
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
              {x === 'BULL' ? 'CALL' : x === 'BEAR' ? 'PUT' : 'RANGE'}
            </button>
          ))}
        </div>
        <div
          className={`text-center text-sm font-black py-1.5 rounded-lg border ${
            side === 'CALL'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
              : side === 'PUT'
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                : 'bg-amber-500/10 border-amber-400/30 text-amber-300'
          }`}
        >
          {side === 'CALL' ? '→ CALL BIAS' : side === 'PUT' ? '→ PUT BIAS' : '→ NO FORCED SIDE'}
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
          {canLock ? `Lock ${label}` : 'Need LIVE LTP'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5 font-mono">
      <div className="bg-[#0D182E] border border-[#D4AF37]/30 p-5 rounded-2xl flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Atom className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider">
              KD AGENT · QUANTUM DESK (REAL DATA)
            </span>
          </div>
          <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">
            Short-horizon locks · CALL / PUT / WAIT
          </h2>
          <p className="text-xs text-[#94A3B8]">
            Live Angel LTP · real HIT/MISS journal · no fake probabilities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-[#070E1C] p-1.5 rounded-xl border border-[#D4AF37]/30">
            {(['NIFTY', 'BANKNIFTY', 'SENSEX'] as Asset[]).map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => {
                  setUnderlying(sym)
                  setTicks([])
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold ${
                  underlying === sym ? 'bg-[#D4AF37] text-[#070E1C]' : 'text-[#94A3B8]'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void fetchBridgeTicks()}
            className="p-2 border border-[#D4AF37]/30 text-[#D4AF37] rounded-xl"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase">LTP</span>
          <div className="text-2xl font-bold text-[#FDFBF7]">
            {spot != null ? spot.toFixed(2) : '—'}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`w-2 h-2 rounded-full ${
                isBridgeLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-[10px] text-[#94A3B8]">
              {isBridgeLive ? `LIVE ${tickTimestamp}` : 'WAITING'} · {phase}
            </span>
          </div>
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase">Indication</span>
          <div className={`text-2xl font-black ${meterColor}`}>{sideHint}</div>
          <span className="text-[10px] text-[#94A3B8]">meter {meterScore}/100</span>
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase">Today</span>
          <div className="text-lg font-bold text-[#FDFBF7]">
            {hits}W / {misses}L
          </div>
          <span className="text-[10px] text-[#D4AF37]">
            {hitRate != null ? `${hitRate}%` : '—'} · {pending.length} open
          </span>
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase">Tape</span>
          <div className="text-sm font-bold text-[#FDFBF7]">{mom.label}</div>
          {err ? (
            <span className="text-[10px] text-amber-200 flex items-center gap-1 mt-1">
              <AlertTriangle className="w-3 h-3" /> {err}
            </span>
          ) : null}
        </div>
      </div>

      <div className="bg-[#0A1628] border border-[#D4AF37]/35 rounded-2xl p-4">
        <div className="flex flex-wrap justify-between gap-2 mb-2">
          <span className="text-[10px] font-bold text-[#D4AF37] uppercase">KD Agent mentor</span>
          <button
            type="button"
            onClick={applyLean}
            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37]"
          >
            Apply lean →{' '}
            {suggestedBias === 'BULL' ? 'CALL' : suggestedBias === 'BEAR' ? 'PUT' : 'RANGE'}
          </button>
        </div>
        <p className="text-xs text-[#E2E8F0] leading-relaxed">{mentorText}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-3 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase">ORB High</span>
          <input
            className="w-full mt-1 bg-[#070E1C] border border-emerald-500/30 rounded px-2 py-1 text-emerald-400 text-sm font-bold"
            value={orbHigh}
            onChange={(e) => setOrbHigh(e.target.value)}
            placeholder="after 9:30"
          />
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-3 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] uppercase">ORB Low</span>
          <input
            className="w-full mt-1 bg-[#070E1C] border border-rose-500/30 rounded px-2 py-1 text-rose-400 text-sm font-bold"
            value={orbLow}
            onChange={(e) => setOrbLow(e.target.value)}
            placeholder="after 9:30"
          />
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-3 rounded-xl col-span-2 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#94A3B8]">TODAY LOG</div>
            <div className="text-sm font-bold text-[#FDFBF7]">
              {todayRows.length} saved (HIT + MISS)
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-[#D4AF37] uppercase mb-3">
          Lock · 5 / 10 / 15 / 30 min
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <MeterCard label="5 min" horizon="5m" bias={bias5} setBias={setBias5} />
          <MeterCard label="10 min" horizon="10m" bias={bias10} setBias={setBias10} />
          <MeterCard label="15 min" horizon="15m" bias={bias15} setBias={setBias15} />
          <MeterCard label="30 min" horizon="30m" bias={bias30} setBias={setBias30} />
        </div>
      </div>

      {pending.length > 0 && (
        <div className="bg-[#0D182E] border border-[#D4AF37]/25 rounded-2xl p-4 space-y-2">
          <span className="text-xs font-bold text-[#D4AF37] uppercase flex items-center gap-2">
            <Clock className="w-4 h-4" /> Open locks
          </span>
          {pending.map((f) => {
            const left = Math.max(0, f.resolveAt - now)
            const m = Math.floor(left / 60000)
            const s = Math.floor((left % 60000) / 1000)
            return (
              <div
                key={f.id}
                className="flex justify-between text-xs bg-[#070E1C] border border-[#D4AF37]/15 rounded-xl px-3 py-2"
              >
                <span className="font-bold text-[#FDFBF7]">
                  {f.asset} · {f.horizon} ·{' '}
                  <span
                    className={
                      f.side === 'CALL'
                        ? 'text-emerald-400'
                        : f.side === 'PUT'
                          ? 'text-rose-400'
                          : 'text-amber-300'
                    }
                  >
                    {f.side}
                  </span>{' '}
                  @ {f.entryLtp.toFixed(1)}
                </span>
                <span className="text-amber-300">
                  {m}:{String(s).padStart(2, '0')}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className="bg-[#0D182E] border border-[#D4AF37]/30 rounded-2xl overflow-hidden">
        <div className="p-4 bg-[#12203D] border-b border-[#D4AF37]/20 text-xs font-bold text-[#D4AF37] uppercase">
          Today report — every real lock
        </div>
        <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070E1C] text-[#94A3B8] sticky top-0">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Asset</th>
                <th className="p-3">H</th>
                <th className="p-3">Side</th>
                <th className="p-3">Lock → Exit</th>
                <th className="p-3">Result</th>
                <th className="p-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4AF37]/10 text-[#FDFBF7]">
              {todayRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-[#94A3B8]">
                    Lock when LIVE. All results saved.
                  </td>
                </tr>
              ) : (
                [...todayRows]
                  .sort((a, b) => b.lockedAt - a.lockedAt)
                  .map((f) => (
                    <tr key={f.id}>
                      <td className="p-3 text-[#94A3B8]">
                        {new Date(f.lockedAt).toLocaleTimeString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="p-3 font-bold">{f.asset}</td>
                      <td className="p-3 text-[#D4AF37] font-bold">{f.horizon}</td>
                      <td className="p-3">
                        {f.side === 'CALL' ? (
                          <span className="text-emerald-400 font-bold">CALL</span>
                        ) : f.side === 'PUT' ? (
                          <span className="text-rose-400 font-bold">PUT</span>
                        ) : (
                          <span className="text-amber-300">—</span>
                        )}
                      </td>
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

      <div className="bg-[#0D182E] border border-[#D4AF37]/30 p-4 rounded-2xl">
        <div className="text-xs font-bold text-[#FDFBF7] mb-2 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-[#D4AF37]" /> {chartSymbol}
        </div>
        <div className="h-[420px] rounded-xl overflow-hidden border border-[#1E2E4E] bg-[#070E1C]">
          <RealTradingViewChart symbol={chartSymbol} height={420} />
        </div>
      </div>

      <div className="bg-[#0D182E] border border-[#D4AF37]/30 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#D4AF37] uppercase">
          <Newspaper className="w-4 h-4" /> India market news
        </div>
        <div className="h-[320px] rounded-xl overflow-hidden border border-[#1E2E4E] bg-black">
          <iframe
            title="India news"
            className="w-full h-full border-none"
            src="https://s.tradingview.com/embed-widget/timeline/?locale=en#%7B%22feedMode%22%3A%22symbol%22%2C%22symbol%22%3A%22NSE%3ANIFTY%22%2C%22isTransparent%22%3Atrue%2C%22displayMode%22%3A%22regular%22%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22colorTheme%22%3A%22dark%22%7D"
          />
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
    'ZOMATO',
    'SBIN',
    'DIXON',
  ]
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = inputVal.trim().toUpperCase().replace(/\.NS$/i, '').replace(/^NSE:/i, '')
    if (clean) {
      setActiveSymbol(clean)
      setInputVal('')
    }
  }
  return (
    <div className="space-y-6 font-mono">
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
      <div className="flex flex-wrap gap-2">
        {heavyweights.map((sym) => (
          <button
            key={sym}
            type="button"
            onClick={() => setActiveSymbol(sym)}
            className={`px-3 py-1.5 rounded-lg text-xs border ${
              activeSymbol === sym
                ? 'bg-[#D4AF37] text-[#070E1C] font-bold'
                : 'border-[#D4AF37]/20 text-[#CBD5E1]'
            }`}
          >
            {sym}
          </button>
        ))}
      </div>
      <div className="h-[520px] rounded-xl overflow-hidden border border-[#1E2E4E] bg-[#070E1C]">
        <RealTradingViewChart symbol={`NSE:${activeSymbol}`} height={520} />
      </div>
    </div>
  )
}

export const InstitutionalFlowsDesk: React.FC = () => (
  <div className="font-mono text-sm text-[#CBD5E1] space-y-2">
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">FII / DII</h2>
    <p className="text-xs text-[#94A3B8]">
      Official EOD only — no fake live institutional feed.
    </p>
    <a
      className="text-[#D4AF37] underline text-xs"
      href="https://www.nseindia.com/reports/fii-dii"
      target="_blank"
      rel="noreferrer"
    >
      NSE FII/DII report
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
  </div>
)

export const SectorEtfMatrix: React.FC = () => (
  <div className="font-mono text-sm text-[#CBD5E1]">
    Use Screener for ETF symbols (SILVERBEES, GOLDBEES, ITBEES).
  </div>
)

export const RiskProtocolDesk: React.FC = () => (
  <div className="grid md:grid-cols-3 gap-4 text-xs text-[#CBD5E1] font-mono">
    <div className="bg-[#0D182E] border border-[#D4AF37]/25 p-5 rounded-2xl">
      <ShieldAlert className="w-4 h-4 text-[#D4AF37] mb-2" />
      Max 1.5% risk per idea
    </div>
    <div className="bg-[#0D182E] border border-[#D4AF37]/25 p-5 rounded-2xl">
      <Activity className="w-4 h-4 text-amber-300 mb-2" />
      Short horizons only · journal every lock
    </div>
    <div className="bg-[#0D182E] border border-[#D4AF37]/25 p-5 rounded-2xl">
      <Zap className="w-4 h-4 text-emerald-400 mb-2" />
      Broker confirms · desk is support only
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
  return <div className="text-sm text-[#FDFBF7]">IPO — NSE filings</div>
}
export function FinancialAdvisorConsensus() {
  return <div className="text-sm text-[#CBD5E1]">Broker research separately</div>
}

export const ExtraPages: React.FC = () => <FoDecisionDesk />
export default ExtraPages
