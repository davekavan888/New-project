import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  RefreshCw,
  Play,
  CheckCircle,
  XCircle,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Gauge,
  Clock,
} from 'lucide-react'

const BRIDGE_URL = String((import.meta as any).env?.VITE_ANGEL_BRIDGE_URL || '').replace(/\/$/, '')

type HorizonKey = '5m' | '10m' | '15m' | '30m'
type SignalType = 'CALL' | 'PUT' | 'WAIT'
type SymbolKey = 'NIFTY' | 'BANKNIFTY'
type FailReason =
  | 'NONE'
  | 'STOPPED'
  | 'TIME_WRONG_SIDE'
  | 'NO_BREAKOUT'
  | 'CHOP'
  | 'DATA_GAP'
  | 'UNKNOWN'

const HORIZON_RULES: Record<HorizonKey, { durationMs: number; targetPts: number; stopPts: number }> = {
  '5m': { durationMs: 5 * 60 * 1000, targetPts: 18, stopPts: 12 },
  '10m': { durationMs: 10 * 60 * 1000, targetPts: 30, stopPts: 20 },
  '15m': { durationMs: 15 * 60 * 1000, targetPts: 45, stopPts: 28 },
  '30m': { durationMs: 30 * 60 * 1000, targetPts: 70, stopPts: 40 },
}

const AUDIT_MS = 45 * 60 * 1000
const LOCKS_KEY = 'novaforge_active_locks_v3'
const SCORE_KEY = 'novaforge_scorecard_v3'
const AUDIT_KEY = 'novaforge_audit_v3'
const ORB_KEY = 'novaforge_manual_orb_v3'
const WEIGHTS_KEY = 'novaforge_rule_weights_v3'

interface ActiveLock {
  horizon: HorizonKey
  symbol: SymbolKey
  entryPrice: number
  targetPrice: number
  stopPrice: number
  direction: 'CALL' | 'PUT'
  lockedAt: number
  expiresAt: number
}

interface ScorecardRecord {
  id: string
  kind: 'LOCK' | 'AUDIT45'
  horizon: HorizonKey | '45m'
  symbol: SymbolKey
  direction: 'CALL' | 'PUT' | 'WAIT'
  entryPrice: number
  exitPrice: number
  targetPrice?: number
  stopPrice?: number
  status: 'HIT' | 'MISS' | 'FLAT' | 'SKIP'
  failReason: FailReason
  note: string
  lockedAt: number
  resolvedAt: number
  dayKey: string
}

interface AuditPending {
  id: string
  symbol: SymbolKey
  signal: SignalType
  entryPrice: number
  lockedAt: number
  expiresAt: number
  dayKey: string
}

const card =
  'rounded-[1.75rem] border-2 border-amber-200/90 bg-white/90 shadow-lg shadow-sky-100/80 backdrop-blur-sm'
const windowFrame =
  'rounded-[1.75rem] border-[3px] border-amber-300 bg-gradient-to-b from-white to-sky-50/80 shadow-xl shadow-amber-100/50'

function istDayKey(ts = Date.now()) {
  return new Date(ts).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}
function isWeekendIST(dayKey: string) {
  const [y, m, d] = dayKey.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d, 6, 0, 0))
  const wd = new Date(utc.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getDay()
  return wd === 0 || wd === 6
}
function pruneWorkingDays(list: ScorecardRecord[]) {
  const days = [...new Set(list.map((r) => r.dayKey))].sort().reverse()
  const work: string[] = []
  for (const d of days) {
    if (!isWeekendIST(d)) work.push(d)
    if (work.length >= 5) break
  }
  const keep = new Set(work)
  return list.filter((r) => keep.has(r.dayKey))
}
function loadJSON<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key)
    return s ? (JSON.parse(s) as T) : fallback
  } catch {
    return fallback
  }
}
function loadWeights() {
  return loadJSON(WEIGHTS_KEY, {
    preferWaitInChop: 0,
    requireStrongerBreak: 0,
    widenStop: 0,
  })
}
function bumpWeight(reason: FailReason) {
  const w = loadWeights()
  if (reason === 'CHOP' || reason === 'NO_BREAKOUT') w.preferWaitInChop += 1
  if (reason === 'STOPPED') w.widenStop += 1
  if (reason === 'TIME_WRONG_SIDE') w.requireStrongerBreak += 1
  localStorage.setItem(WEIGHTS_KEY, JSON.stringify(w))
}

export const RealTradingViewChart: React.FC<{ symbol: string; height?: number }> = ({
  symbol,
  height = 380,
}) => {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ''
    const box = document.createElement('div')
    box.style.height = `${height}px`
    box.style.width = '100%'
    el.appendChild(box)
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    const tv =
      symbol === 'BANKNIFTY' || symbol.includes('BANKNIFTY')
        ? 'NSE:BANKNIFTY'
        : symbol.includes(':')
          ? symbol
          : `NSE:${symbol}`
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tv,
      interval: '5',
      timezone: 'Asia/Kolkata',
      theme: 'light',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      support_host: 'https://www.tradingview.com',
    })
    el.appendChild(script)
    return () => {
      el.innerHTML = ''
    }
  }, [symbol, height])
  return <div ref={ref} style={{ height }} className="w-full rounded-2xl overflow-hidden border border-amber-100" />
}

/** KD's Agent — light-skin king-advisor illustration (CSS, no external face) */
/** KD's Royal King-Advisor — Custom Vector Persona */
function AgentGuide({ signal }: { signal: SignalType }) {
  return (
    <div className={`${windowFrame} p-5 flex flex-col md:flex-row gap-5 items-center relative overflow-hidden`}>
      <div className="relative shrink-0 flex flex-col items-center">
        <div className="relative p-2 rounded-3xl bg-gradient-to-b from-amber-200/60 via-amber-50 to-amber-100/80 border-2 border-amber-300 shadow-md">
          <svg
            viewBox="0 0 240 320"
            className="w-32 h-44 md:w-36 md:h-48 drop-shadow-md select-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="goldMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fffbeb" />
                <stop offset="25%" stopColor="#fde047" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="75%" stopColor="#ca8a04" />
                <stop offset="100%" stopColor="#854d0e" />
              </linearGradient>
              <linearGradient id="royalFabric" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e1b18" />
                <stop offset="40%" stopColor="#120f0c" />
                <stop offset="100%" stopColor="#080705" />
              </linearGradient>
              <linearGradient id="crimsonSash" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="60%" stopColor="#be123c" />
                <stop offset="100%" stopColor="#881337" />
              </linearGradient>
              <linearGradient id="shadesLens" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="50%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#020617" />
              </linearGradient>
              <radialGradient id="sunGlow" cx="50%" cy="30%" r="60%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="120" cy="110" r="100" fill="url(#sunGlow)" />
            <circle cx="120" cy="110" r="85" fill="none" stroke="#eab308" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
            <path
              d="M20 320 L35 240 Q60 215 95 208 L120 220 L145 208 Q180 215 205 240 L220 320 Z"
              fill="url(#royalFabric)"
              stroke="#ca8a04"
              strokeWidth="1.5"
            />
            <path d="M30 245 Q55 220 85 212 L80 235 Q55 240 30 255 Z" fill="url(#goldMetallic)" />
            <path d="M210 245 Q185 220 155 212 L160 235 Q185 240 210 255 Z" fill="url(#goldMetallic)" />
            <path d="M65 210 Q110 240 180 320 L150 320 Q95 250 50 225 Z" fill="url(#crimsonSash)" opacity="0.95" />
            <path d="M65 210 Q110 240 180 320" fill="none" stroke="url(#goldMetallic)" strokeWidth="2" />
            <path d="M90 220 Q120 250 150 220" fill="none" stroke="url(#goldMetallic)" strokeWidth="3" />
            <circle cx="120" cy="242" r="6" fill="#dc2626" stroke="url(#goldMetallic)" strokeWidth="1.5" />
            <path d="M102 170 L102 215 Q120 222 138 215 L138 170 Z" fill="#d49b6a" />
            <path
              d="M80 120 C78 160 92 194 120 194 C148 194 162 160 160 120 C160 85 148 76 120 76 C92 76 80 85 80 120 Z"
              fill="#e0a97a"
            />
            <path d="M110 165 Q120 171 130 165" fill="none" stroke="#8c4e28" strokeWidth="2" strokeLinecap="round" />
            <path d="M119 135 L117 150 Q120 154 123 150 Z" fill="#c27d4c" />
            <g>
              <path d="M112 120 Q120 117 128 120" fill="none" stroke="url(#goldMetallic)" strokeWidth="2.5" />
              <line x1="110" y1="124" x2="130" y2="124" stroke="url(#goldMetallic)" strokeWidth="1.5" />
              <path
                d="M86 116 Q108 116 110 124 L108 138 Q97 148 88 138 Q82 128 86 116 Z"
                fill="url(#shadesLens)"
                stroke="url(#goldMetallic)"
                strokeWidth="2"
              />
              <path
                d="M154 116 Q132 116 130 124 L132 138 Q143 148 152 138 Q158 128 154 116 Z"
                fill="url(#shadesLens)"
                stroke="url(#goldMetallic)"
                strokeWidth="2"
              />
              <path d="M90 120 L102 135 L98 137 L87 123 Z" fill="#ffffff" opacity="0.25" />
              <path d="M134 120 L146 135 L142 137 L131 123 Z" fill="#ffffff" opacity="0.25" />
            </g>
            <path d="M118 84 L122 84 L122 104 L118 104 Z" fill="#dc2626" />
            <path d="M114 92 L126 92" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />
            <circle cx="120" cy="107" r="2" fill="#facc15" />
            <path
              d="M78 112 Q75 88 90 74 Q120 62 150 74 Q165 88 162 112 Q155 86 142 80 Q120 76 98 80 Q85 86 78 112 Z"
              fill="#171412"
            />
            <path
              d="M84 76 L96 46 L108 62 L120 32 L132 62 L144 46 L156 76 Q120 68 84 76 Z"
              fill="url(#goldMetallic)"
              stroke="#78350f"
              strokeWidth="1.5"
            />
            <polygon points="120,48 125,56 120,64 115,56" fill="#ef4444" stroke="#fde047" strokeWidth="1" />
            <path d="M128 32 Q140 16 154 22 Q145 32 134 32 Z" fill="#171412" />
            <circle cx="78" cy="142" r="4.5" fill="url(#goldMetallic)" stroke="#854d0e" strokeWidth="1" />
            <circle cx="162" cy="142" r="4.5" fill="url(#goldMetallic)" stroke="#854d0e" strokeWidth="1" />
          </svg>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-0.5 rounded-full bg-amber-400 text-slate-900 font-black text-[9px] uppercase tracking-wider shadow">
            KD&apos;S SOVEREIGN DESK
          </div>
        </div>
      </div>
      <div className="flex-1 text-center md:text-left space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700">Guide · levels only</div>
        <p className="text-sm text-slate-700 leading-relaxed">
          {signal === 'CALL' && 'Price above ORB high — bias CALL. Lock a horizon only if size is small and stop is set.'}
          {signal === 'PUT' && 'Price below ORB low — bias PUT. Lock only with clear invalidation.'}
          {signal === 'WAIT' && 'Inside ORB or no levels — WAIT. Protect capital; no forced trade.'}
        </p>
      </div>
      <div
        className={`px-5 py-3 rounded-2xl text-center min-w-[120px] border-2 font-black text-lg ${
          signal === 'CALL'
            ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
            : signal === 'PUT'
              ? 'bg-rose-100 border-rose-400 text-rose-800'
              : 'bg-amber-50 border-amber-300 text-amber-800'
        }`}
      >
        {signal === 'CALL' ? (
          <span className="inline-flex items-center gap-1"><TrendingUp className="w-5 h-5" /> CALL</span>
        ) : signal === 'PUT' ? (
          <span className="inline-flex items-center gap-1"><TrendingDown className="w-5 h-5" /> PUT</span>
        ) : (
          <span className="inline-flex items-center gap-1"><Minus className="w-5 h-5" /> WAIT</span>
        )}
      </div>
    </div>
  )
}


export const HistoricalReportDesk: React.FC = () => {
  const [rows, setRows] = useState(() => pruneWorkingDays(loadJSON<ScorecardRecord[]>(SCORE_KEY, [])))
  const [weights, setWeights] = useState(loadWeights)
  useEffect(() => {
    const id = setInterval(() => {
      setRows(pruneWorkingDays(loadJSON(SCORE_KEY, [])))
      setWeights(loadWeights())
    }, 2000)
    return () => clearInterval(id)
  }, [])
  const byDay = rows.reduce<Record<string, ScorecardRecord[]>>((acc, r) => {
    ;(acc[r.dayKey] ||= []).push(r)
    return acc
  }, {})
  const days = Object.keys(byDay).sort().reverse()
  const failCounts = rows
    .filter((r) => r.status === 'MISS')
    .reduce<Record<string, number>>((a, r) => {
      a[r.failReason] = (a[r.failReason] || 0) + 1
      return a
    }, {})

  return (
    <div className="space-y-5">
      <div className={`${windowFrame} p-5`}>
        <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-widest mb-1">
          📜 Document room
        </div>
        <h2 className="text-2xl font-serif font-bold text-slate-800">Report card · 5 working days</h2>
        <p className="text-xs text-slate-500 mt-1">
          Every lock + 45m audit. Open the site a few times in market hours so windows can resolve.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <div className={`${card} p-4 text-xs`}>
          <div className="font-bold text-amber-800 mb-2">Self-tune</div>
          <div>WAIT bias: {weights.preferWaitInChop}</div>
          <div>Stronger break: {weights.requireStrongerBreak}</div>
          <div>Wider stop: {weights.widenStop}</div>
        </div>
        <div className={`${card} p-4 text-xs md:col-span-2`}>
          <div className="font-bold text-rose-700 mb-2">MISS reasons</div>
          {Object.keys(failCounts).length === 0 ? (
            <span className="text-slate-400">None yet</span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(failCounts).map(([k, v]) => (
                <span key={k} className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                  {k}: {v}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {days.length === 0 ? (
        <div className={`${card} p-8 text-center text-slate-400 text-sm`}>No archive pages yet — lock trades on Trade Desk.</div>
      ) : (
        days.map((day) => {
          const list = byDay[day]
          const hits = list.filter((r) => r.status === 'HIT').length
          const miss = list.filter((r) => r.status === 'MISS').length
          return (
            <div key={day} className={`${card} overflow-hidden`}>
              <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-sky-50 border-b border-amber-100 flex flex-wrap gap-3 text-xs font-bold">
                <span className="text-amber-900">{day}</span>
                <span className="text-emerald-700">HIT {hits}</span>
                <span className="text-rose-700">MISS {miss}</span>
                <span className="text-slate-500">N={list.length}</span>
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="text-slate-500 sticky top-0 bg-white">
                    <tr>
                      <th className="p-2">Time</th>
                      <th className="p-2">Kind</th>
                      <th className="p-2">H</th>
                      <th className="p-2">Side</th>
                      <th className="p-2">Entry</th>
                      <th className="p-2">Exit</th>
                      <th className="p-2">Result</th>
                      <th className="p-2">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-50">
                    {list.map((r) => (
                      <tr key={r.id} className={r.status === 'HIT' ? 'bg-emerald-50/40' : r.status === 'MISS' ? 'bg-rose-50/40' : ''}>
                        <td className="p-2 text-slate-500">
                          {new Date(r.resolvedAt).toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' })}
                        </td>
                        <td className="p-2">{r.kind}</td>
                        <td className="p-2 text-amber-800 font-semibold">{r.horizon}</td>
                        <td className="p-2 font-bold">{r.direction}</td>
                        <td className="p-2">{r.entryPrice.toFixed(1)}</td>
                        <td className="p-2">{r.exitPrice.toFixed(1)}</td>
                        <td className={`p-2 font-bold ${r.status === 'HIT' ? 'text-emerald-700' : r.status === 'MISS' ? 'text-rose-700' : 'text-amber-700'}`}>
                          {r.status}
                        </td>
                        <td className="p-2 text-slate-600">{r.status === 'MISS' ? r.failReason : r.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}


/** Tactical flow meter — ORB distance + session filter (visual aid, not a second signal engine) */
export const QuantDeskOverlay: React.FC<{
  ltp: number | null
  orbHigh: number
  orbLow: number
  symbol: string
  nowTs?: number
}> = ({ ltp, orbHigh, orbLow, symbol, nowTs = Date.now() }) => {
  const hasOrb = !Number.isNaN(orbHigh) && !Number.isNaN(orbLow) && orbHigh > orbLow

  const ist = new Date(nowTs).toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false })
  const [hh, mm] = ist.split(':').map(Number)
  const istMins = hh * 60 + mm
  const m915 = 9 * 60 + 15
  const m930 = 9 * 60 + 30
  const m1130 = 11 * 60 + 30
  const m1300 = 13 * 60
  const m1445 = 14 * 60 + 45
  const m1530 = 15 * 60 + 30

  let sessionPhase = 'CLOSED'
  let sessionLabel = 'Market closed'
  let safeToTrade = false
  if (istMins >= m915 && istMins < m1530) {
    if (istMins < m930) {
      sessionPhase = 'ORB'
      sessionLabel = 'ORB forming — wait 9:30'
      safeToTrade = false
    } else if (istMins >= m1130 && istMins < m1300) {
      sessionPhase = 'CHOP'
      sessionLabel = 'Midday chop — low conviction'
      safeToTrade = false
    } else if (istMins >= m1445) {
      sessionPhase = 'LATE'
      sessionLabel = 'Late session — no new risk'
      safeToTrade = false
    } else {
      sessionPhase = 'MOMENTUM'
      sessionLabel = 'Prime momentum window'
      safeToTrade = true
    }
  }

  let score = 0
  let status = 'STANDSTILL / NO ORB'
  let statusColor = 'text-amber-600 border-amber-300 bg-amber-50'
  let needleAngle = 0
  let callGate = 0
  let putGate = 0
  let distanceToCall = 0
  let distanceToPut = 0

  if (ltp && hasOrb) {
    const mult = symbol === 'BANKNIFTY' ? 2.5 : 1.0
    const range = orbHigh - orbLow
    const buffer = Math.max(6 * mult, range * 0.08)
    callGate = Number((orbHigh + buffer).toFixed(1))
    putGate = Number((orbLow - buffer).toFixed(1))
    distanceToCall = Number(Math.max(0, callGate - ltp).toFixed(1))
    distanceToPut = Number(Math.max(0, ltp - putGate).toFixed(1))

    if (ltp > callGate) {
      const surge = ltp - callGate
      score = Math.min(100, Math.round(25 + (surge / Math.max(range * 0.4, 1)) * 75))
    } else if (ltp < putGate) {
      const drop = putGate - ltp
      score = Math.max(-100, Math.round(-25 - (drop / Math.max(range * 0.4, 1)) * 75))
    } else {
      const mid = (orbHigh + orbLow) / 2
      const rel = (ltp - mid) / Math.max(range / 2, 1)
      score = Math.round(rel * 18)
    }
    needleAngle = (score / 100) * 85

    if (score >= 45) {
      status = 'STRONG CALL PRESSURE'
      statusColor = 'text-emerald-700 border-emerald-300 bg-emerald-50'
    } else if (score <= -45) {
      status = 'STRONG PUT PRESSURE'
      statusColor = 'text-rose-700 border-rose-300 bg-rose-50'
    } else if (score > 18) {
      status = 'BULLISH BUILDING'
      statusColor = 'text-emerald-600 border-emerald-200 bg-emerald-50/50'
    } else if (score < -18) {
      status = 'BEARISH BUILDING'
      statusColor = 'text-rose-600 border-rose-200 bg-rose-50/50'
    } else {
      status = 'CHOP / INSIDE RANGE'
      statusColor = 'text-amber-600 border-amber-300 bg-amber-50'
    }
  }

  return (
    <div className="rounded-[1.75rem] border-2 border-amber-300/80 bg-gradient-to-br from-white via-amber-50/30 to-sky-50/50 p-4 sm:p-5 shadow-lg shadow-amber-100/60 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center">
            <Gauge className="w-4 h-4 text-amber-800" />
          </div>
          <div>
            <div className="text-xs font-serif font-black tracking-wider text-slate-800 uppercase">
              {symbol} Tactical Flow Meter
            </div>
            <div className="text-[10px] text-slate-500 font-medium">ORB distance · session filter · visual only</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold border ${
              safeToTrade
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-900 border-amber-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{sessionLabel}</span>
          </div>
          <div className={`text-xs font-black px-3.5 py-1 rounded-xl border shadow-sm ${statusColor}`}>{status}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-3 text-center space-y-0.5">
          <div className="text-[10px] uppercase font-bold text-rose-700 flex items-center justify-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" /> Put gate
          </div>
          <div className="text-xl font-black text-rose-800 font-mono">{putGate > 0 ? `< ${putGate}` : 'Set ORB'}</div>
          <div className="text-[10px] text-slate-500">{ltp && putGate ? `${distanceToPut} pts away` : '—'}</div>
        </div>

        <div className="flex flex-col items-center justify-center">
          <svg viewBox="0 0 220 120" className="w-52 select-none overflow-visible">
            <defs>
              <linearGradient id="meterArc" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <path d="M 25 105 A 85 85 0 0 1 195 105" fill="none" stroke="#e2e8f0" strokeWidth="16" strokeLinecap="round" />
            <path d="M 25 105 A 85 85 0 0 1 195 105" fill="none" stroke="url(#meterArc)" strokeWidth="10" strokeLinecap="round" />
            <text x="25" y="118" fill="#e11d48" fontSize="9" fontWeight="bold" textAnchor="middle">PUT</text>
            <text x="110" y="50" fill="#b45309" fontSize="8" fontWeight="bold" textAnchor="middle">CHOP</text>
            <text x="195" y="118" fill="#059669" fontSize="9" fontWeight="bold" textAnchor="middle">CALL</text>
            <g style={{ transform: `rotate(${needleAngle}deg)`, transformOrigin: '110px 105px' }}>
              <polygon points="108,105 112,105 111,28 109,28" fill="#1e293b" />
              <circle cx="110" cy="28" r="2.5" fill="#f59e0b" />
            </g>
            <circle cx="110" cy="105" r="9" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
          </svg>
          <span className="text-[11px] font-mono font-black text-slate-700 bg-white px-3 py-0.5 rounded-full border border-amber-200 shadow-sm mt-1">
            Flow: {score > 0 ? `+${score}` : score}
          </span>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3 text-center space-y-0.5">
          <div className="text-[10px] uppercase font-bold text-emerald-700 flex items-center justify-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Call gate
          </div>
          <div className="text-xl font-black text-emerald-800 font-mono">{callGate > 0 ? `> ${callGate}` : 'Set ORB'}</div>
          <div className="text-[10px] text-slate-500">{ltp && callGate ? `${distanceToCall} pts away` : '—'}</div>
        </div>
      </div>
      {!safeToTrade && sessionPhase !== 'CLOSED' ? (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Session filter: prefer WAIT / no new locks in this window.
        </p>
      ) : null}
    </div>
  )
}


export const FoDecisionDesk: React.FC = () => {
  const [symbol, setSymbol] = useState<SymbolKey>('NIFTY')
  const [liveLtp, setLiveLtp] = useState<number | null>(null)
  const [orbHighInput, setOrbHighInput] = useState('')
  const [orbLowInput, setOrbLowInput] = useState('')
  const [isBridgeOnline, setIsBridgeOnline] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('--:--:--')
  const [err, setErr] = useState('')
  const [now, setNow] = useState(Date.now())
  const [activeLocks, setActiveLocks] = useState<Record<string, ActiveLock>>(() => loadJSON(LOCKS_KEY, {}))
  const [scorecard, setScorecard] = useState<ScorecardRecord[]>(() => pruneWorkingDays(loadJSON(SCORE_KEY, [])))
  const [audits, setAudits] = useState<AuditPending[]>(() => loadJSON(AUDIT_KEY, []))
  const [lastAuditAt, setLastAuditAt] = useState(0)
  const evaluating = useRef(false)

  useEffect(() => {
    const o = loadJSON<{ high?: string; low?: string }>(ORB_KEY, {})
    if (o.high) setOrbHighInput(String(o.high))
    if (o.low) setOrbLowInput(String(o.low))
  }, [])
  useEffect(() => {
    localStorage.setItem(ORB_KEY, JSON.stringify({ high: orbHighInput, low: orbLowInput }))
  }, [orbHighInput, orbLowInput])
  useEffect(() => {
    localStorage.setItem(LOCKS_KEY, JSON.stringify(activeLocks))
  }, [activeLocks])
  useEffect(() => {
    localStorage.setItem(SCORE_KEY, JSON.stringify(pruneWorkingDays(scorecard).slice(0, 500)))
  }, [scorecard])
  useEffect(() => {
    localStorage.setItem(AUDIT_KEY, JSON.stringify(audits))
  }, [audits])
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const fetchSnapshot = useCallback(async () => {
    if (!BRIDGE_URL) {
      setIsBridgeOnline(false)
      setErr('Set VITE_ANGEL_BRIDGE_URL on Vercel')
      return
    }
    try {
      const res = await fetch(`${BRIDGE_URL}/snapshot`, { cache: 'no-store' })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const data = await res.json()
      let px: number | null = null
      if (data.ltp && typeof data.ltp === 'object') {
        px = Number(symbol === 'NIFTY' ? data.ltp.NIFTY : data.ltp.BANKNIFTY)
      } else if (symbol === 'NIFTY' && data.nifty?.ltp) px = Number(data.nifty.ltp)
      else if (symbol === 'BANKNIFTY' && data.bankNifty?.ltp) px = Number(data.bankNifty.ltp)
      if (px && px > 0) {
        setLiveLtp(px)
        setIsBridgeOnline(true)
        setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' }))
        setErr('')
      } else {
        setIsBridgeOnline(false)
        setErr(data.quoteError || data.error || 'No LTP')
      }
    } catch (e) {
      setIsBridgeOnline(false)
      setErr(String(e))
    }
  }, [symbol])

  useEffect(() => {
    void fetchSnapshot()
    const t = setInterval(() => void fetchSnapshot(), 2000)
    return () => clearInterval(t)
  }, [fetchSnapshot])

  const orbHigh = parseFloat(orbHighInput)
  const orbLow = parseFloat(orbLowInput)
  const hasOrb = !Number.isNaN(orbHigh) && !Number.isNaN(orbLow) && orbHigh > orbLow
  const weights = loadWeights()

  const deriveSignal = (): SignalType => {
    if (!liveLtp || !hasOrb) return 'WAIT'
    if (liveLtp > orbHigh + (weights.requireStrongerBreak > 2 ? 4 : 0)) return 'CALL'
    if (liveLtp < orbLow - (weights.requireStrongerBreak > 2 ? 4 : 0)) return 'PUT'
    return 'WAIT'
  }
  const signal = deriveSignal()

  const pushScore = (row: ScorecardRecord) => {
    setScorecard((prev) => pruneWorkingDays([row, ...prev]).slice(0, 500))
    if (row.status === 'MISS') bumpWeight(row.failReason)
  }

  useEffect(() => {
    if (!liveLtp || evaluating.current) return
    evaluating.current = true
    try {
      const locks = { ...activeLocks }
      let changed = false
      const remaining: Record<string, ActiveLock> = {}
      const t = Date.now()
      Object.entries(locks).forEach(([key, lock]) => {
        let done = false
        let status: ScorecardRecord['status'] = 'MISS'
        let reason: FailReason = 'UNKNOWN'
        let note = ''
        if (lock.direction === 'CALL') {
          if (liveLtp >= lock.targetPrice) {
            done = true
            status = 'HIT'
            reason = 'NONE'
            note = 'Target'
          } else if (liveLtp <= lock.stopPrice) {
            done = true
            status = 'MISS'
            reason = 'STOPPED'
            note = 'Stop'
          } else if (t >= lock.expiresAt) {
            done = true
            if (liveLtp > lock.entryPrice + 2) {
              status = 'HIT'
              reason = 'NONE'
              note = 'Time green'
            } else if (Math.abs(liveLtp - lock.entryPrice) < 3) {
              status = 'FLAT'
              reason = 'CHOP'
              note = 'Flat'
            } else {
              status = 'MISS'
              reason = 'TIME_WRONG_SIDE'
              note = 'Time wrong'
            }
          }
        } else {
          if (liveLtp <= lock.targetPrice) {
            done = true
            status = 'HIT'
            reason = 'NONE'
            note = 'Target'
          } else if (liveLtp >= lock.stopPrice) {
            done = true
            status = 'MISS'
            reason = 'STOPPED'
            note = 'Stop'
          } else if (t >= lock.expiresAt) {
            done = true
            if (liveLtp < lock.entryPrice - 2) {
              status = 'HIT'
              reason = 'NONE'
              note = 'Time green'
            } else if (Math.abs(liveLtp - lock.entryPrice) < 3) {
              status = 'FLAT'
              reason = 'CHOP'
              note = 'Flat'
            } else {
              status = 'MISS'
              reason = 'TIME_WRONG_SIDE'
              note = 'Time wrong'
            }
          }
        }
        if (done) {
          changed = true
          pushScore({
            id: `${key}_${t}`,
            kind: 'LOCK',
            horizon: lock.horizon,
            symbol: lock.symbol,
            direction: lock.direction,
            entryPrice: lock.entryPrice,
            exitPrice: liveLtp,
            targetPrice: lock.targetPrice,
            stopPrice: lock.stopPrice,
            status,
            failReason: reason,
            note,
            lockedAt: lock.lockedAt,
            resolvedAt: t,
            dayKey: istDayKey(lock.lockedAt),
          })
        } else remaining[key] = lock
      })
      if (changed) setActiveLocks(remaining)
    } finally {
      evaluating.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveLtp, now])

  useEffect(() => {
    if (!liveLtp || !isBridgeOnline) return
    const t = Date.now()
    const still: AuditPending[] = []
    audits.forEach((a) => {
      if (t < a.expiresAt) {
        still.push(a)
        return
      }
      let status: ScorecardRecord['status'] = 'FLAT'
      let reason: FailReason = 'CHOP'
      let note = '45m closed'
      if (a.signal === 'WAIT') {
        status = 'SKIP'
        reason = 'NO_BREAKOUT'
        note = 'WAIT window'
      } else if (a.signal === 'CALL') {
        if (liveLtp > a.entryPrice + 8) {
          status = 'HIT'
          reason = 'NONE'
          note = 'Up'
        } else if (liveLtp < a.entryPrice - 8) {
          status = 'MISS'
          reason = 'TIME_WRONG_SIDE'
          note = 'Down'
        }
      } else if (a.signal === 'PUT') {
        if (liveLtp < a.entryPrice - 8) {
          status = 'HIT'
          reason = 'NONE'
          note = 'Down'
        } else if (liveLtp > a.entryPrice + 8) {
          status = 'MISS'
          reason = 'TIME_WRONG_SIDE'
          note = 'Up'
        }
      }
      pushScore({
        id: a.id + '_done',
        kind: 'AUDIT45',
        horizon: '45m',
        symbol: a.symbol,
        direction: a.signal,
        entryPrice: a.entryPrice,
        exitPrice: liveLtp,
        status,
        failReason: reason,
        note,
        lockedAt: a.lockedAt,
        resolvedAt: t,
        dayKey: a.dayKey,
      })
    })
    if (still.length !== audits.length) setAudits(still)
    const ist = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false })
    const [hh, mm] = ist.split(':').map(Number)
    const mins = hh * 60 + mm
    if (mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30) {
      if (lastAuditAt === 0 || t - lastAuditAt >= AUDIT_MS) {
        setAudits((prev) => [
          ...prev.filter((x) => x.expiresAt > t),
          {
            id: `audit_${symbol}_${t}`,
            symbol,
            signal,
            entryPrice: liveLtp,
            lockedAt: t,
            expiresAt: t + AUDIT_MS,
            dayKey: istDayKey(t),
          },
        ])
        setLastAuditAt(t)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveLtp, now, isBridgeOnline])

  const handleLockHorizon = (horizon: HorizonKey) => {
    if (!liveLtp || !isBridgeOnline) {
      setErr('Need LIVE price to lock')
      return
    }
    if (signal === 'WAIT') {
      setErr('WAIT — set ORB and wait for break')
      return
    }
    const rule = HORIZON_RULES[horizon]
    const mult = symbol === 'BANKNIFTY' ? 2.5 : 1
    const stopExtra = weights.widenStop > 2 ? 1.15 : 1
    const td = rule.targetPts * mult
    const sd = rule.stopPts * mult * stopExtra
    const targetPrice = signal === 'CALL' ? liveLtp + td : liveLtp - td
    const stopPrice = signal === 'CALL' ? liveLtp - sd : liveLtp + sd
    setActiveLocks((prev) => ({
      ...prev,
      [`${symbol}_${horizon}`]: {
        horizon,
        symbol,
        entryPrice: liveLtp,
        targetPrice: Number(targetPrice.toFixed(2)),
        stopPrice: Number(stopPrice.toFixed(2)),
        direction: signal,
        lockedAt: Date.now(),
        expiresAt: Date.now() + rule.durationMs,
      },
    }))
    setErr('')
  }

  const hits = scorecard.filter((s) => s.status === 'HIT').length
  const misses = scorecard.filter((s) => s.status === 'MISS').length
  const pendingAudit = audits.find((a) => a.symbol === symbol && a.expiresAt > now)

  return (
    <div className="space-y-5">
      <AgentGuide signal={signal} />

      <QuantDeskOverlay
        ltp={liveLtp}
        orbHigh={orbHigh}
        orbLow={orbLow}
        symbol={symbol}
        nowTs={now}
      />

      <div className={`${windowFrame} p-4 flex flex-col lg:flex-row gap-4 justify-between`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-sky-50 p-1 rounded-2xl border border-sky-100">
            {(['NIFTY', 'BANKNIFTY'] as SymbolKey[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSymbol(s)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold ${
                  symbol === s ? 'bg-amber-300 text-slate-900' : 'text-slate-500'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Live LTP</div>
            <div className="text-2xl font-black text-slate-800">{liveLtp != null ? liveLtp.toFixed(2) : '—'}</div>
          </div>
          <div
            className={`px-3 py-2 rounded-2xl text-xs font-bold border ${
              isBridgeOnline ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            {isBridgeOnline ? `LIVE ${lastUpdated}` : 'Bridge off'}
          </div>
        </div>
        <button type="button" onClick={() => void fetchSnapshot()} className="self-start p-2 rounded-xl border border-amber-200 bg-white text-amber-700">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      {err ? <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{err}</p> : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`${card} p-3`}>
          <div className="text-[10px] text-slate-500 font-bold">ORB HIGH</div>
          <input
            className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50/50 px-2 py-1.5 text-emerald-800 font-bold"
            value={orbHighInput}
            onChange={(e) => setOrbHighInput(e.target.value)}
            placeholder="After 9:30"
          />
        </div>
        <div className={`${card} p-3`}>
          <div className="text-[10px] text-slate-500 font-bold">ORB LOW</div>
          <input
            className="mt-1 w-full rounded-xl border border-rose-200 bg-rose-50/50 px-2 py-1.5 text-rose-800 font-bold"
            value={orbLowInput}
            onChange={(e) => setOrbLowInput(e.target.value)}
            placeholder="After 9:30"
          />
        </div>
        <div className={`${card} p-3`}>
          <div className="text-[10px] text-slate-500 font-bold">45m AUDIT</div>
          <div className="text-sm font-bold text-slate-800 mt-1">
            {pendingAudit ? `${pendingAudit.signal} · ${Math.max(0, Math.floor((pendingAudit.expiresAt - now) / 60000))}m` : 'Next window soon'}
          </div>
        </div>
        <div className={`${card} p-3`}>
          <div className="text-[10px] text-slate-500 font-bold">WEALTH SCORECARD</div>
          <div className="mt-1 flex items-center gap-2 text-sm font-black">
            <span className="text-emerald-700 inline-flex items-center gap-0.5"><TrendingUp className="w-4 h-4" />{hits}</span>
            <span className="text-slate-300">/</span>
            <span className="text-rose-700 inline-flex items-center gap-0.5"><TrendingDown className="w-4 h-4" />{misses}</span>
          </div>
        </div>
      </div>

      {/* LOCK PANEL — very visible */}
      <div className={`${windowFrame} overflow-hidden`}>
        <div className="px-4 py-3 bg-gradient-to-r from-amber-100 via-lime-50 to-sky-100 border-b border-amber-200 flex flex-wrap justify-between gap-2">
          <span className="text-sm font-black text-slate-800">🔒 LOCK TRADE · 5 / 10 / 15 / 30 min</span>
          <span className="text-[11px] text-slate-600 font-semibold">Different target & stop each · only when CALL or PUT</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-amber-100">
          {(['5m', '10m', '15m', '30m'] as HorizonKey[]).map((hz) => {
            const rule = HORIZON_RULES[hz]
            const mult = symbol === 'BANKNIFTY' ? 2.5 : 1
            const stopExtra = weights.widenStop > 2 ? 1.15 : 1
            const td = rule.targetPts * mult
            const sd = rule.stopPts * mult * stopExtra
            const lock = activeLocks[`${symbol}_${hz}`]
            const tgt =
              liveLtp && signal !== 'WAIT'
                ? (signal === 'CALL' ? liveLtp + td : liveLtp - td).toFixed(1)
                : '—'
            const stp =
              liveLtp && signal !== 'WAIT'
                ? (signal === 'CALL' ? liveLtp - sd : liveLtp + sd).toFixed(1)
                : '—'
            const wealthUp = signal === 'CALL'
            return (
              <div
                key={hz}
                className={`p-4 space-y-2 ${
                  wealthUp && signal !== 'WAIT' ? 'bg-emerald-50/30' : signal === 'PUT' ? 'bg-rose-50/30' : 'bg-white/50'
                }`}
              >
                <div className="flex justify-between text-xs font-black">
                  <span>{hz.toUpperCase()}</span>
                  <span className={signal === 'CALL' ? 'text-emerald-700' : signal === 'PUT' ? 'text-rose-700' : 'text-amber-700'}>
                    {signal}
                  </span>
                </div>
                {lock ? (
                  <div className="text-[11px] space-y-1 rounded-2xl border border-amber-200 bg-white p-3">
                    <div className="font-bold text-emerald-700">LOCKED {lock.direction}</div>
                    <div>Entry {lock.entryPrice.toFixed(1)}</div>
                    <div className="text-emerald-700">Target {lock.targetPrice}</div>
                    <div className="text-rose-700">Stop {lock.stopPrice}</div>
                    <div className="text-slate-500">{Math.max(0, Math.floor((lock.expiresAt - now) / 1000))}s left</div>
                  </div>
                ) : (
                  <>
                    <div className="text-[11px] rounded-2xl border border-slate-100 bg-white p-2 space-y-1">
                      <div className="flex justify-between"><span className="text-slate-500">Target</span><span className="text-emerald-700 font-bold">{tgt}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Stop</span><span className="text-rose-700 font-bold">{stp}</span></div>
                    </div>
                    <button
                      type="button"
                      disabled={!isBridgeOnline || !liveLtp || signal === 'WAIT'}
                      onClick={() => handleLockHorizon(hz)}
                      className="w-full py-2.5 rounded-2xl text-xs font-black flex items-center justify-center gap-1 bg-gradient-to-r from-amber-300 to-lime-300 text-slate-900 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 shadow-md"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> LOCK {hz}
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className={`${card} p-3`}>
        <RealTradingViewChart symbol={symbol} height={380} />
      </div>
    </div>
  )
}

export const UniversalStockScreener: React.FC = () => {
  const [sym, setSym] = useState('RELIANCE')
  const [input, setInput] = useState('')
  return (
    <div className="space-y-4">
      <form
        className={`${card} p-3 flex gap-2`}
        onSubmit={(e) => {
          e.preventDefault()
          const c = input.trim().toUpperCase().replace(/\.NS$/i, '')
          if (c) {
            setSym(c)
            setInput('')
          }
        }}
      >
        <Search className="w-4 h-4 text-amber-600 mt-2.5 ml-1" />
        <input
          className="flex-1 rounded-xl border border-amber-100 px-3 py-2 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="NSE symbol"
        />
        <button type="submit" className="px-4 rounded-xl bg-amber-300 font-bold text-xs">Load</button>
      </form>
      <div className={card + ' p-2'}>
        <RealTradingViewChart symbol={`NSE:${sym}`} height={480} />
      </div>
    </div>
  )
}

export const InstitutionalFlowsDesk = () => (
  <div className={`${card} p-6 text-sm text-slate-600`}>
    Official EOD:{' '}
    <a className="text-amber-800 font-semibold underline" href="https://www.nseindia.com/reports/fii-dii" target="_blank" rel="noreferrer">
      NSE FII/DII
    </a>
  </div>
)

export const VisualNewsWireDesk = () => (
  <div className="space-y-3">
    <div className={`${windowFrame} p-5`}>
      <h2 className="font-serif text-xl font-bold text-slate-800">Event calendar</h2>
      <p className="text-xs text-slate-500">Quiet checklist — not a news firehose.</p>
    </div>
    <div className="grid md:grid-cols-2 gap-3">
      {[
        ['Weekly', 'Index expiry — wider swings near close'],
        ['Monthly', 'Expiry week — smaller size'],
        ['Macro', 'RBI / CPI / Budget — prefer WAIT into print'],
        ['Global', 'Fed week — watch opening gaps'],
      ].map(([t, d]) => (
        <div key={t} className={`${card} p-4`}>
          <div className="text-xs font-bold text-amber-800 uppercase">{t}</div>
          <p className="text-sm text-slate-600 mt-1">{d}</p>
        </div>
      ))}
    </div>
  </div>
)

export const SectorEtfMatrix = () => (
  <div className={`${card} p-6 text-sm text-slate-600`}>SILVERBEES · GOLDBEES · ITBEES — open in Stock Charts</div>
)

export const RiskProtocolDesk = () => (
  <div className={`${windowFrame} p-6 text-sm text-slate-700 space-y-2`}>
    <p className="font-bold text-amber-900">Guard rails</p>
    <p>Max ~1.5% risk per idea · no lock on WAIT · read MISS reasons in Report Card Archive</p>
  </div>
)

export default FoDecisionDesk
