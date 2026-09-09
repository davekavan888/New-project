import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Search,
  BarChart2,
  ShieldAlert,
  Activity,
  Zap,
  RefreshCw,
  X,
  Clock,
  Target,
  CheckCircle2,
  XCircle,
  Newspaper,
  BookOpen,
  History,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'

const BRIDGE_URL = String(
  (import.meta as any).env?.VITE_ANGEL_BRIDGE_URL || '',
).replace(/\/$/, '')

const FORECAST_KEY = 'novaforge_forecast_v5'
const JOURNAL_KEY = 'novaforge_journal_v1'
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
  mentorNote?: string
}

interface Tick {
  t: number
  px: number
}

const PLAYBOOK = [
  {
    id: 'callput',
    title: 'CALL vs PUT',
    body: 'CALL = upside bias. PUT = downside bias. RANGE = no forced option side. Confirm on broker chart before any order.',
  },
  {
    id: 'orb',
    title: 'ORB',
    body: 'Mark 9:15–9:30 high/low after 9:30. Prefer trades only after a clean hold above/below the range.',
  },
  {
    id: 'short',
    title: 'Short horizons',
    body: '5–30 min locks score more cleanly than multi-hour guesses. One open idea per horizon.',
  },
  {
    id: 'invalidation',
    title: 'Invalidation',
    body: 'If price violates your invalidation edge against the bias, take MISS and stop averaging.',
  },
  {
    id: 'session',
    title: 'Session',
    body: 'ORB window = observe. Morning = higher volume. Midday = chop risk. Last hour = position-squaring noise.',
  },
]

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
  const wd = istParts(utc).weekday
  return wd === 'Sat' || wd === 'Sun'
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
    // migrate v4 if present
    const old = localStorage.getItem('novaforge_forecast_v4')
    if (old) {
      const rows = JSON.parse(old) as ForecastRecord[]
      localStorage.setItem(FORECAST_KEY, old)
      return rows
    }
    return []
  } catch {
    return []
  }
}

function pruneWorkingDays(rows: ForecastRecord[]): ForecastRecord[] {
  const keys = [...new Set(rows.map((r) => r.dayKey))].filter((k) => !isWeekendKey(k)).sort()
  const keep = new Set(keys.slice(-MAX_WORKING_DAYS))
  return rows.filter((r) => keep.has(r.dayKey) || keys.length < MAX_WORKING_DAYS)
}

function saveAll(rows: ForecastRecord[]) {
  const pruned = pruneWorkingDays(rows).slice(0, 600)
  try {
    localStorage.setItem(FORECAST_KEY, JSON.stringify(pruned))
  } catch {
    /* quota */
  }
  return pruned
}

function momentumFromTicks(ticks: Tick[]): { delta: number; label: string } {
  if (ticks.length < 3) return { delta: 0, label: 'thin tape' }
  const a = ticks[0].px
  const b = ticks[ticks.length - 1].px
  const delta = b - a
  const abs = Math.abs(delta)
  if (abs < 5) return { delta, label: 'flat tape' }
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
  const {
    phase,
    live,
    spot,
    asset,
    orbH,
    orbL,
    mom,
    pending,
    hitRate,
    suggested,
  } = args

  if (!live || spot == null) {
    return 'KD Agent: Bridge offline or no LTP. Do not lock until LIVE is green.'
  }

  if (phase === 'WEEKEND' || phase === 'CLOSED' || phase === 'PRE') {
    return `KD Agent: Market phase = ${phase}. Use charts for prep only. No live locks needed until cash market opens.`
  }

  if (phase === 'ORB') {
    return 'KD Agent: ORB window (9:15–9:30). Observe high/low. Prefer WAIT — mark ORB, lock only after 9:30 hold.'
  }

  const parts: string[] = []
  parts.push(`KD Agent · ${asset} @ ${spot.toFixed(1)} · ${phase} · tape: ${mom.label}.`)

  if (orbH != null && orbL != null && orbH > orbL) {
    if (spot > orbH) {
      parts.push(`Price above ORB high ${orbH.toFixed(1)} → breakout context.`)
    } else if (spot < orbL) {
      parts.push(`Price below ORB low ${orbL.toFixed(1)} → breakdown context.`)
    } else {
      parts.push(`Inside ORB ${orbL.toFixed(1)}–${orbH.toFixed(1)} → range risk.`)
    }
  } else {
    parts.push('ORB not set — mark 9:15–9:30 high/low for better context.')
  }

  if (suggested === 'BULL') {
    parts.push('Suggested lean: CALL bias on short horizons only if tape supports.')
  } else if (suggested === 'BEAR') {
    parts.push('Suggested lean: PUT bias on short horizons only if tape supports.')
  } else {
    parts.push('Suggested lean: WAIT / RANGE — no forced option side.')
  }

  if (pending.length) {
    parts.push(`${pending.length} open lock(s) — avoid stacking same idea.`)
  }

  if (hitRate != null) {
    parts.push(`Today resolved accuracy: ${hitRate}% (HIT vs MISS only).`)
  }

  if (phase === 'MID') {
    parts.push('Mid-session: chop risk higher — smaller size or WAIT is valid.')
  }
  if (phase === 'CLOSING') {
    parts.push('Closing window: square-off noise — prefer no new aggression.')
  }

  parts.push('Not advice. Confirm on broker. Journal every lock.')
  return parts.join(' ')
}

// ===================== HISTORICAL REPORT =====================
export const HistoricalReportDesk: React.FC = () => {
  const [rows, setRows] = useState<ForecastRecord[]>(() => loadAll())
  const [day, setDay] = useState<string>(() => dayKeyIST())

  useEffect(() => {
    const id = setInterval(() => setRows(loadAll()), 2000)
    return () => clearInterval(id)
  }, [])

  const dayKeys = useMemo(() => {
    const keys = [...new Set(rows.map((r) => r.dayKey))].sort().reverse()
    return keys.slice(0, MAX_WORKING_DAYS)
  }, [rows])

  const dayRows = rows
    .filter((r) => r.dayKey === day)
    .sort((a, b) => b.lockedAt - a.lockedAt)

  const hits = dayRows.filter((r) => r.result === 'HIT').length
  const misses = dayRows.filter((r) => r.result === 'MISS').length
  const pending = dayRows.filter((r) => !r.resolved).length
  const totalDone = hits + misses
  const rate = totalDone ? Math.round((hits / totalDone) * 100) : null

  const exportCsv = () => {
    const header = 'day,time,asset,horizon,side,bias,entry,exit,result,reason\n'
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
        f.bias,
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
    a.download = `novaforge-report-${day}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5 font-mono">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#FDFBF7] flex items-center gap-2">
            <History className="w-5 h-5 text-[#60A5FA]" /> 5-day report card
          </h2>
          <p className="text-xs text-[#94A3B8]">
            All locks · HIT + MISS · auto-drop older than {MAX_WORKING_DAYS} working days
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {(dayKeys.length ? dayKeys : [dayKeyIST()]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setDay(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                day === k
                  ? 'bg-[#60A5FA] text-[#070E1C] border-[#60A5FA]'
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
          <div className="text-[10px] text-[#94A3B8] uppercase">Entries</div>
          <div className="text-2xl font-bold text-[#FDFBF7]">{dayRows.length}</div>
        </div>
        <div className="bg-[#0D182E] border border-emerald-500/30 p-4 rounded-xl">
          <div className="text-[10px] text-[#94A3B8] uppercase">HIT</div>
          <div className="text-2xl font-bold text-emerald-400">{hits}</div>
        </div>
        <div className="bg-[#0D182E] border border-rose-500/30 p-4 rounded-xl">
          <div className="text-[10px] text-[#94A3B8] uppercase">MISS</div>
          <div className="text-2xl font-bold text-rose-400">{misses}</div>
        </div>
        <div className="bg-[#0D182E] border border-[#60A5FA]/30 p-4 rounded-xl">
          <div className="text-[10px] text-[#94A3B8] uppercase">Accuracy</div>
          <div className="text-2xl font-bold text-[#60A5FA]">
            {rate != null ? `${rate}%` : '—'}
          </div>
          {pending > 0 && (
            <div className="text-[10px] text-amber-300">{pending} pending</div>
          )}
        </div>
      </div>

      <div className="bg-[#0D182E] border border-[#D4AF37]/30 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070E1C] text-[#94A3B8] border-b border-[#D4AF37]/15 sticky top-0">
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
                    No locks for this day.
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
                    <td className="p-3 text-[#60A5FA] font-bold">{f.horizon}</td>
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
                    <td className="p-3 text-[#CBD5E1] max-w-sm">{f.reason || '—'}</td>
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

// ===================== MAIN DESK =====================
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

  // load ORB once
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
      setErr('Set VITE_ANGEL_BRIDGE_URL in Vercel')
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
        const px =
          map[underlying] ??
          (underlying === 'SENSEX' ? map.NIFTY : undefined)
        if (px != null) {
          setTicks((prev) => {
            const next = [...prev, { t: Date.now(), px }]
            return next.slice(-MAX_TICKS)
          })
        }
      } else {
        setIsBridgeLive(false)
        setErr(data.quoteError || data.error || 'No LTP in snapshot')
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

  // resolve all pending
  useEffect(() => {
    setForecasts((prev) => {
      let changed = false
      const next = prev.map((f) => {
        if (f.resolved) return f
        if (now < f.resolveAt) return f
        const px =
          ltpMap[f.asset] ??
          (f.asset === 'SENSEX' ? ltpMap.NIFTY : undefined)
        if (px == null) return f
        changed = true
        return evaluateForecast(f, px)
      })
      if (changed) return saveAll(next)
      return prev
    })
  }, [now, ltpMap])

  const spot =
    ltpMap[underlying] ??
    (underlying === 'SENSEX' ? ltpMap.NIFTY ?? null : null) ??
    null

  const pad =
    underlying === 'BANKNIFTY' ? 40 : underlying === 'SENSEX' ? 80 : 18

  const bandFor = (bias: Bias, s: number) => {
    if (bias === 'BULL') return { low: s - pad * 0.45, high: s + pad * 1.15 }
    if (bias === 'BEAR') return { low: s - pad * 1.15, high: s + pad * 0.45 }
    return { low: s - pad * 0.7, high: s + pad * 0.7 }
  }

  const oh = parseFloat(orbHigh)
  const ol = parseFloat(orbLow)
  const orbH = !Number.isNaN(oh) ? oh : null
  const orbL = !Number.isNaN(ol) ? ol : null

  const mom = momentumFromTicks(ticks)

  // suggested bias from ORB + tape + session
  const suggestedBias: Bias = useMemo(() => {
    if (phase === 'ORB' || phase === 'PRE' || phase === 'CLOSED' || phase === 'WEEKEND') {
      return 'RANGE'
    }
    let score = 0
    if (spot != null && orbH != null && orbL != null && orbH > orbL) {
      if (spot > orbH) score += 2
      else if (spot < orbL) score -= 2
    }
    if (mom.delta > 12) score += 1
    else if (mom.delta < -12) score -= 1
    if (phase === 'MID' || phase === 'CLOSING') {
      // prefer range in choppy windows unless strong break
      if (Math.abs(score) < 2) return 'RANGE'
    }
    if (score >= 2) return 'BULL'
    if (score <= -2) return 'BEAR'
    return 'RANGE'
  }, [phase, spot, orbH, orbL, mom.delta])

  // apply suggested to unlocked cards only once when user clicks "Apply lean"
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
  const hitRate =
    hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : null

  const canTradePhase =
    phase === 'MORNING' ||
    phase === 'MID' ||
    phase === 'AFTERNOON' ||
    phase === 'CLOSING'

  const lockForecast = (horizon: Horizon, bias: Bias) => {
    if (!isBridgeLive || spot == null) {
      setErr('Need LIVE LTP to lock')
      return
    }
    if (!canTradePhase) {
      setErr(`Phase ${phase}: prefer WAIT (observe only)`)
      return
    }
    const dup = forecasts.some(
      (f) =>
        !f.resolved &&
        f.asset === underlying &&
        f.horizon === horizon,
    )
    if (dup) {
      setErr(`Open ${horizon} lock already on ${underlying}`)
      return
    }
    // max 4 open total
    if (pending.length >= 4) {
      setErr('Max 4 open locks — wait for resolve')
      return
    }
    const { low, high } = bandFor(bias, spot)
    const mentorNote = buildMentor({
      phase,
      live: isBridgeLive,
      spot,
      asset: underlying,
      orbH,
      orbL,
      mom,
      pending,
      hitRate,
      suggested: bias,
    })
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
      mentorNote,
    }
    const next = saveAll([rec, ...forecasts])
    setForecasts(next)
    setErr('')
  }

  // meter score
  let meterScore = 50
  if (spot != null && orbH != null && orbL != null && orbH > orbL) {
    if (spot > orbH) meterScore += 22
    else if (spot < orbL) meterScore -= 22
    else meterScore += ((spot - orbL) / (orbH - orbL) - 0.5) * 26
  }
  meterScore += Math.max(-12, Math.min(12, mom.delta * 0.4))
  for (const f of pending) {
    if (f.bias === 'BULL') meterScore += 3
    if (f.bias === 'BEAR') meterScore -= 3
  }
  meterScore = Math.max(0, Math.min(100, Math.round(meterScore)))
  const sideHint =
    meterScore >= 62 ? 'CALL' : meterScore <= 38 ? 'PUT' : 'WAIT'
  const meterLabel =
    sideHint === 'CALL'
      ? 'BULLISH · favour CALL'
      : sideHint === 'PUT'
        ? 'BEARISH · favour PUT'
        : 'NEUTRAL · no forced side'
  const meterColor =
    sideHint === 'CALL'
      ? 'text-emerald-400'
      : sideHint === 'PUT'
        ? 'text-rose-400'
        : 'text-amber-300'

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
    const canLock = isBridgeLive && spot != null && canTradePhase
    const side = biasToSide(bias)
    return (
      <div className="bg-[#0D182E] border border-[#D4AF37]/25 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-[#60A5FA] uppercase">{label}</span>
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
          {side === 'CALL'
            ? '→ TAKE CALL BIAS'
            : side === 'PUT'
              ? '→ TAKE PUT BIAS'
              : '→ NO FORCED SIDE'}
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
          {canLock ? `Lock ${label}` : 'Need LIVE · active session'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5 font-mono">
      {/* TOP PANEL */}
      <div className="bg-gradient-to-r from-[#0D182E] to-[#12203D] border border-[#D4AF37]/40 rounded-2xl p-4 md:p-5">
        <div className="flex flex-col md:flex-row gap-5 items-stretch">
          <div className="shrink-0 flex flex-col items-center gap-2 justify-center">
            <img
              src="/kd-agent.svg"
              alt="KD's Agent"
              className="w-28 h-36 object-contain drop-shadow-[0_0_18px_rgba(96,165,250,0.35)]"
            />
            <span className="text-[10px] font-bold text-[#60A5FA] tracking-widest">
              KD&apos;S AGENT
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#070E1C] border border-[#60A5FA]/30 text-[#94A3B8]">
              {phase}
            </span>
          </div>

          <div className="flex-1 w-full space-y-3">
            <div className="flex flex-wrap justify-between gap-2 items-center">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isBridgeLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="text-[11px] font-bold text-[#60A5FA] uppercase">
                  {isBridgeLive ? `LTP LIVE · ${tickTimestamp} IST` : 'BRIDGE WAITING'}
                </span>
                {err ? (
                  <span className="text-[10px] text-amber-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {err}
                  </span>
                ) : null}
              </div>
              <div className="flex gap-1.5 bg-[#070E1C] p-1 rounded-xl border border-[#D4AF37]/30">
                {(['NIFTY', 'BANKNIFTY', 'SENSEX'] as Asset[]).map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => {
                      setUnderlying(sym)
                      setTicks([])
                    }}
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

            <div className="bg-[#070E1C] border border-[#D4AF37]/25 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-[#94A3B8] uppercase">Direction meter</span>
                <span className={`text-sm font-black ${meterColor}`}>{meterLabel}</span>
              </div>
              <div className="h-3 rounded-full bg-[#1E2E4E] overflow-hidden">
                <div className="h-full w-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400" />
              </div>
              <div className="relative h-0">
                <div
                  className="absolute -top-3 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white transition-all"
                  style={{ left: `calc(${meterScore}% - 8px)` }}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 text-center text-xs">
                <div className="bg-[#0D182E] rounded-lg p-2 border border-[#D4AF37]/15">
                  <div className="text-[10px] text-[#94A3B8]">Spot</div>
                  <div className="font-bold text-[#FDFBF7]">
                    {spot != null ? spot.toFixed(1) : '—'}
                  </div>
                </div>
                <div
                  className={`rounded-lg p-2 border ${
                    sideHint === 'CALL'
                      ? 'bg-emerald-500/20 border-emerald-500/50'
                      : sideHint === 'PUT'
                        ? 'bg-rose-500/20 border-rose-500/50'
                        : 'bg-[#0D182E] border-[#D4AF37]/15'
                  }`}
                >
                  <div className="text-[10px] text-[#94A3B8]">Indication</div>
                  <div
                    className={`font-black text-sm ${
                      sideHint === 'CALL'
                        ? 'text-emerald-400'
                        : sideHint === 'PUT'
                          ? 'text-rose-400'
                          : 'text-amber-300'
                    }`}
                  >
                    {sideHint}
                  </div>
                </div>
                <div className="bg-[#0D182E] rounded-lg p-2 border border-[#D4AF37]/15">
                  <div className="text-[10px] text-[#94A3B8]">Today acc.</div>
                  <div className="font-bold text-[#60A5FA]">
                    {hitRate != null ? `${hitRate}%` : '—'}
                  </div>
                </div>
                <div className="bg-[#0D182E] rounded-lg p-2 border border-[#D4AF37]/15">
                  <div className="text-[10px] text-[#94A3B8]">Saved today</div>
                  <div className="font-bold text-[#FDFBF7]">{todayRows.length}</div>
                </div>
              </div>
            </div>

            {/* MENTOR SPEECH */}
            <div className="bg-[#0A1628] border border-[#60A5FA]/35 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold text-[#60A5FA] uppercase tracking-wider">
                  KD Agent · rule mentor (free)
                </span>
                <button
                  type="button"
                  onClick={applyLean}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#60A5FA]/15 border border-[#60A5FA]/40 text-[#60A5FA]"
                >
                  Apply lean → all cards (
                  {suggestedBias === 'BULL'
                    ? 'CALL'
                    : suggestedBias === 'BEAR'
                      ? 'PUT'
                      : 'RANGE'}
                  )
                </button>
              </div>
              <p className="text-xs text-[#E2E8F0] leading-relaxed">{mentorText}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {PLAYBOOK.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setLesson(lesson === p.id ? null : p.id)}
            className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold ${
              lesson === p.id
                ? 'bg-[#60A5FA] text-[#070E1C]'
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
      </div>
      {lesson && (
        <div className="bg-[#0D182E] border border-[#60A5FA]/30 rounded-xl p-3 text-xs text-[#CBD5E1]">
          {PLAYBOOK.find((x) => x.id === lesson)?.body}
        </div>
      )}

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
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-3 rounded-xl col-span-2 flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] text-[#94A3B8] uppercase">Today log</div>
            <div className="text-sm text-[#FDFBF7] font-bold">
              {hits} HIT · {misses} MISS · {pending.length} open
            </div>
          </div>
          <div className="text-[10px] text-[#94A3B8] text-right">
            Tape: {mom.label}
            <br />
            All entries saved
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-[#60A5FA] uppercase mb-3">
          Lock system — 5 / 10 / 15 / 30 min
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

      {/* TODAY REPORT */}
      <div className="bg-[#0D182E] border border-[#D4AF37]/30 rounded-2xl overflow-hidden">
        <div className="p-4 bg-[#12203D] border-b border-[#D4AF37]/20 text-xs font-bold text-[#60A5FA] uppercase flex justify-between">
          <span>Today report — every lock</span>
          <span className="text-[#94A3B8] normal-case">
            {todayRows.length} · History tab = 5 days
          </span>
        </div>
        <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
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
                    Lock when LIVE. HIT and MISS both stay saved.
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
                      <td className="p-3 text-[#60A5FA] font-bold">{f.horizon}</td>
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

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0D182E] border border-[#D4AF37]/30 p-4 rounded-2xl">
          <div className="text-xs font-bold text-[#FDFBF7] mb-2 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#60A5FA]" /> NSE:NIFTY
          </div>
          <div className="h-[380px] rounded-xl overflow-hidden bg-black border border-[#1E2E4E]">
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
          <div className="text-xs font-bold text-[#FDFBF7] mb-2 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#60A5FA]" /> BSE:SENSEX
          </div>
          <div className="h-[380px] rounded-xl overflow-hidden bg-black border border-[#1E2E4E]">
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

      {/* NEWS */}
      <div className="bg-[#0D182E] border border-[#D4AF37]/30 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#60A5FA] uppercase">
          <Newspaper className="w-4 h-4" /> India market news
        </div>
        <div className="h-[340px] rounded-xl overflow-hidden border border-[#1E2E4E] bg-black">
          <iframe
            title="India news"
            className="w-full h-full border-none"
            src="https://s.tradingview.com/embed-widget/timeline/?locale=en#%7B%22feedMode%22%3A%22symbol%22%2C%22symbol%22%3A%22NSE%3ANIFTY%22%2C%22isTransparent%22%3Atrue%2C%22displayMode%22%3A%22regular%22%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22colorTheme%22%3A%22dark%22%7D"
          />
        </div>
        <div className="flex flex-wrap gap-3 text-[11px]">
          <a className="text-[#60A5FA] underline" href="https://www.moneycontrol.com/news/business/markets/" target="_blank" rel="noreferrer">Moneycontrol</a>
          <a className="text-[#60A5FA] underline" href="https://www.livemint.com/market" target="_blank" rel="noreferrer">Mint</a>
          <a className="text-[#60A5FA] underline" href="https://economictimes.indiatimes.com/markets" target="_blank" rel="noreferrer">ET Markets</a>
        </div>
      </div>
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
        <Search className="w-4 h-4 absolute left-3 top-3 text-[#60A5FA]" />
        <input
          className="w-full bg-[#0D182E] border border-[#60A5FA]/40 rounded-xl pl-9 pr-20 py-2.5 text-xs text-[#FDFBF7]"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="NSE symbol"
        />
        <button type="submit" className="absolute right-1.5 top-1.5 bg-[#60A5FA] text-[#070E1C] px-3 py-1 rounded-lg text-xs font-bold">
          Load
        </button>
      </form>
      <div className="h-[520px] rounded-xl overflow-hidden bg-black border border-[#1E2E4E]">
        <iframe
          key={nse}
          title={nse}
          className="w-full h-full border-none"
          src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(nse)}&interval=D&theme=dark&style=1&timezone=Asia%2FKolkata`}
        />
      </div>
    </div>
  )
}

export const InstitutionalFlowsDesk: React.FC = () => (
  <div className="font-mono text-sm text-[#CBD5E1] space-y-2">
    <h2 className="text-xl font-serif font-bold text-[#FDFBF7]">FII / DII</h2>
    <a className="text-[#60A5FA] underline text-xs" href="https://www.nseindia.com/reports/fii-dii" target="_blank" rel="noreferrer">
      NSE official FII/DII report
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
  <div className="font-mono text-sm text-[#CBD5E1]">Use Screener for ETF symbols (e.g. SILVERBEES, ITBEES).</div>
)

export const RiskProtocolDesk: React.FC = () => (
  <div className="grid md:grid-cols-3 gap-4 text-xs text-[#CBD5E1] font-mono">
    <div className="bg-[#0D182E] border border-[#D4AF37]/25 p-5 rounded-2xl">
      <ShieldAlert className="w-4 h-4 text-[#60A5FA] mb-2" />
      Fixed % risk · no revenge trades
    </div>
    <div className="bg-[#0D182E] border border-[#D4AF37]/25 p-5 rounded-2xl">
      <Activity className="w-4 h-4 text-amber-300 mb-2" />
      Short horizons only · journal every lock
    </div>
    <div className="bg-[#0D182E] border border-[#D4AF37]/25 p-5 rounded-2xl">
      <Zap className="w-4 h-4 text-emerald-400 mb-2" />
      Broker confirms · desk is decision support
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
  return <div className="text-sm text-[#FDFBF7]">IPO — check NSE / official filings</div>
}
export function FinancialAdvisorConsensus() {
  return <div className="text-sm text-[#CBD5E1]">Use broker research separately</div>
}

export const ExtraPages: React.FC = () => <FoDecisionDesk />
export default ExtraPages
