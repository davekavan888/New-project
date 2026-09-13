import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  RefreshCw,
  Play,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Search,
  Compass,
  Crown,
  Scroll,
  Zap,
} from 'lucide-react'

const BRIDGE_URL = String((import.meta as any).env?.VITE_ANGEL_BRIDGE_URL || '').replace(/\/$/, '')

export type HorizonKey = '5m' | '10m' | '15m' | '30m'
export type SignalType = 'CALL' | 'PUT' | 'WAIT'
export type SymbolKey = 'NIFTY' | 'SENSEX' | 'BANKNIFTY'
export type FailReason =
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
const LOCKS_KEY = 'novaforge_active_locks_v5'
const SCORE_KEY = 'novaforge_scorecard_v5'
const AUDIT_KEY = 'novaforge_audit_v5'
const ORB_KEY = 'novaforge_manual_orb_v5'
const WEIGHTS_KEY = 'novaforge_rule_weights_v5'

interface ActiveLock {
  id: string
  horizon: HorizonKey
  symbol: SymbolKey
  entryPrice: number
  targetPrice: number
  stopPrice: number
  direction: 'CALL' | 'PUT'
  lockedAt: number
  expiresAt: number
  maxFavorable: number
  maxAdverse: number
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
  pnlPoints: number
  status: 'HIT' | 'MISS' | 'FLAT' | 'SKIP'
  failReason: FailReason
  note: string
  lockedAt: number
  resolvedAt: number
  dayKey: string
  mfe?: number
  mae?: number
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

// Imperial Golden Kingdom Styles
const royalCard =
  'rounded-[1.75rem] border border-amber-500/40 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-amber-950/20 shadow-2xl shadow-amber-950/30 backdrop-blur-md text-amber-100/90'
const imperialWindow =
  'rounded-[2rem] border-2 border-amber-400/60 bg-gradient-to-br from-slate-950 via-[#13110d] to-[#1c1608] shadow-[0_20px_50px_rgba(217,119,6,0.15)] text-slate-100'
const goldPill =
  'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 text-slate-950 font-black shadow-md shadow-amber-500/20'

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

export function getSessionStatus(nowTs = Date.now()) {
  const ist = new Date(nowTs).toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false })
  const [hh, mm] = ist.split(':').map(Number)
  const mins = hh * 60 + mm
  const m915 = 9 * 60 + 15
  const m930 = 9 * 60 + 30
  const m1130 = 11 * 60 + 30
  const m1300 = 13 * 60
  const m1445 = 14 * 60 + 45
  const m1530 = 15 * 60 + 30

  if (mins < m915 || mins >= m1530) return { canLock: false, label: 'Koshagar Closed (Post-Market)', phase: 'CLOSED' }
  if (mins < m930) return { canLock: false, label: 'Pratham Kaal (09:15-09:30 ORB Creation)', phase: 'ORB' }
  if (mins >= m1130 && mins < m1300) return { canLock: true, label: 'Chanakya Chop Watch (Midday)', phase: 'CHOP' }
  if (mins >= m1445) return { canLock: false, label: 'Sandhya Kaal (Guarding Capital)', phase: 'LATE' }
  return { canLock: true, label: 'Vijaya Muhurat (Active Range Expansion)', phase: 'MOMENTUM' }
}

/** Vector Imperial Chanakya-Chandragupta Persona */
function ChanakyaAdvisorAvatar({ signal, sessionLabel }: { signal: SignalType; sessionLabel: string }) {
  return (
    <div className={`${imperialWindow} p-5 flex flex-col md:flex-row gap-5 items-center relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative shrink-0 flex flex-col items-center">
        <div className="w-24 h-24 rounded-full border-2 border-amber-300/80 bg-gradient-to-b from-[#2a1e0b] via-[#16120c] to-[#0a0805] shadow-[0_0_25px_rgba(245,158,11,0.35)] flex items-center justify-center relative p-1.5">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Halo of Wisdom */}
            <circle cx="50" cy="48" r="42" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
            {/* Royal Gold Mukut / Crown */}
            <path d="M35 32 L50 14 L65 32 L57 37 L50 25 L43 37 Z" fill="url(#crownGrad)" stroke="#ffd700" strokeWidth="1" />
            {/* Chanakya Topknot (Shikha) */}
            <path d="M48 14 Q52 6 62 10 Q56 16 51 16 Z" fill="#1c1917" />
            {/* Pandit Tilak */}
            <path d="M49 32 L51 32 L51 40 L49 40 Z" fill="#ef4444" />
            <circle cx="50" cy="43" r="1.5" fill="#f59e0b" />
            {/* Face Contour */}
            <path d="M34 40 C34 58 40 68 50 68 C60 68 66 58 66 40 C66 32 60 30 50 30 C40 30 34 32 34 40 Z" fill="#d4a373" />
            {/* Wise Eyes */}
            <ellipse cx="43" cy="43" rx="2.5" ry="1.2" fill="#1c1917" />
            <ellipse cx="57" cy="43" rx="2.5" ry="1.2" fill="#1c1917" />
            {/* Royal Beard / Mustache */}
            <path d="M42 53 Q50 58 58 53 Q50 64 42 53 Z" fill="#292524" />
            {/* Royal Kundan Necklace / Armor */}
            <path d="M30 70 C35 63 65 63 70 70 L78 95 C62 98 38 98 22 95 Z" fill="url(#armorGrad)" stroke="#d97706" strokeWidth="1" />
            <circle cx="50" cy="74" r="3" fill="#ef4444" stroke="#ffd700" strokeWidth="1" />
            <defs>
              <linearGradient id="crownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#ca8a04" />
              </linearGradient>
              <linearGradient id="armorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#78350f" />
                <stop offset="50%" stopColor="#451a03" />
                <stop offset="100%" stopColor="#1e1b4b" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span className="mt-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
          Acharya K's Desk
        </span>
      </div>

      <div className="flex-1 space-y-1.5 text-center md:text-left">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
          <div className="text-[11px] font-serif tracking-widest uppercase text-amber-400 font-bold flex items-center gap-1">
            <Crown className="w-3.5 h-3.5 text-amber-400" /> Royal Shastra Assessment
          </div>
          <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-amber-950/70 font-semibold border border-amber-500/40 text-amber-200">
            {sessionLabel}
          </span>
        </div>
        <p className="text-xs text-amber-100/80 leading-relaxed max-w-2xl font-sans">
          {signal === 'CALL' &&
            'The army marches north. Bulls have sustained high ground beyond the breakout gates. Favorable for CALL lock.'}
          {signal === 'PUT' &&
            'Defense breached downward. Downside flow dominant below fortress range low. PUT locks valid with tight stops.'}
          {signal === 'WAIT' &&
            'Inside the fortress gates (Noise Zone). As Chanakya teaches: An untimely move destroys wealth. Preserve ammunition.'}
        </p>
      </div>

      <div
        className={`px-6 py-3.5 rounded-2xl text-center min-w-[150px] border-2 font-black text-xl shadow-lg ${
          signal === 'CALL'
            ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-emerald-900/30'
            : signal === 'PUT'
              ? 'bg-rose-950/80 border-rose-400 text-rose-300 shadow-rose-900/30'
              : 'bg-amber-950/60 border-amber-400/70 text-amber-300 shadow-amber-900/30'
        }`}
      >
        <div className="text-[9px] uppercase tracking-widest opacity-70 mb-0.5 font-bold">Execution Mandate</div>
        {signal === 'CALL' ? (
          <span className="inline-flex items-center gap-1"><TrendingUp className="w-5 h-5" /> CALL BIAS</span>
        ) : signal === 'PUT' ? (
          <span className="inline-flex items-center gap-1"><TrendingDown className="w-5 h-5" /> PUT BIAS</span>
        ) : (
          <span className="inline-flex items-center gap-1"><Minus className="w-5 h-5" /> PATIENCE (WAIT)</span>
        )}
      </div>
    </div>
  )
}

/** Interactive Tactical Screen with Synthetic Trajectory Projection */
export const RoyalDualChartDesk: React.FC<{
  symbol: SymbolKey
  signal: SignalType
  ltp: number | null
  orbHigh: number
  orbLow: number
  targetPts: number
  stopPts: number
}> = ({ symbol, signal, ltp, orbHigh, orbLow, targetPts, stopPts }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [showTrajectory, setShowTrajectory] = useState(true)

  const tvSymbol =
    symbol === 'SENSEX' ? 'BSE:SENSEX' : symbol === 'BANKNIFTY' ? 'NSE:BANKNIFTY' : 'NSE:NIFTY'

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ''
    const box = document.createElement('div')
    box.style.height = '420px'
    box.style.width = '100%'
    el.appendChild(box)
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: '5',
      timezone: 'Asia/Kolkata',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: '#0a0907',
      gridColor: 'rgba(217, 119, 6, 0.08)',
      enable_publishing: false,
    })
    el.appendChild(script)
    return () => { el.innerHTML = '' }
  }, [tvSymbol])

  // Compute Trajectory Vectors
  const hasLevels = !Number.isNaN(orbHigh) && !Number.isNaN(orbLow) && orbHigh > orbLow && ltp != null
  const projectedTarget = ltp ? (signal === 'PUT' ? ltp - targetPts : ltp + targetPts) : 0
  const projectedStop = ltp ? (signal === 'PUT' ? ltp + stopPts : ltp - stopPts) : 0

  return (
    <div className={`${royalCard} p-4 relative overflow-hidden border-2 border-amber-500/30`}>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-500/20 mb-3">
        <div className="flex items-center gap-2">
          <Scroll className="w-4 h-4 text-amber-400" />
          <span className="font-serif font-bold text-amber-200 text-sm tracking-wider uppercase">
            {symbol} Shastra Screen · {tvSymbol}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowTrajectory((v) => !v)}
            className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              showTrajectory
                ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                : 'bg-slate-800/60 border-slate-700 text-slate-400'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            {showTrajectory ? 'Predicted Trajectory Flow: ON' : 'Predicted Flow: OFF'}
          </button>
        </div>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-amber-500/20 bg-black/80">
        <div ref={ref} style={{ height: 420 }} className="w-full" />

        {/* Dynamic Trajectory Canvas Vector Overlay */}
        {showTrajectory && hasLevels && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 bg-gradient-to-r from-black/60 via-transparent to-black/70">
            <svg className="w-full h-full absolute inset-0" preserveAspectRatio="none" viewBox="0 0 400 200">
              {/* Fortress Boundary Levels */}
              <line x1="0" y1="40" x2="400" y2="40" stroke="#10b981" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
              <line x1="0" y1="160" x2="400" y2="160" stroke="#f43f5e" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />

              {/* Trajectory Vector Flow Line */}
              {signal === 'CALL' && (
                <g>
                  <path
                    d="M 50 120 Q 200 90, 350 30"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeDasharray="6 3"
                    className="animate-pulse"
                  />
                  <polygon points="350,30 335,32 344,45" fill="#10b981" />
                </g>
              )}
              {signal === 'PUT' && (
                <g>
                  <path
                    d="M 50 80 Q 200 110, 350 170"
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="3.5"
                    strokeDasharray="6 3"
                    className="animate-pulse"
                  />
                  <polygon points="350,170 335,168 344,155" fill="#f43f5e" />
                </g>
              )}
              {signal === 'WAIT' && (
                <path
                  d="M 50 100 Q 120 75, 200 100 T 350 100"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />
              )}
            </svg>

            {/* Tactical HUD Markers */}
            <div className="relative z-10 flex justify-between items-start">
              <div className="bg-black/80 backdrop-blur-md border border-amber-500/40 px-3 py-1.5 rounded-xl text-[11px] font-mono">
                <div className="text-emerald-400 font-bold">ORB High: {orbHigh}</div>
                <div className="text-rose-400 font-bold">ORB Low: {orbLow}</div>
              </div>
              <div className="bg-black/80 backdrop-blur-md border border-amber-500/40 p-2.5 rounded-xl text-right text-[11px] space-y-0.5">
                <div className="text-amber-400 font-bold uppercase tracking-wider text-[10px]">Predicted Horizon Target</div>
                <div className="text-emerald-300 font-black text-sm">
                  {signal === 'WAIT' ? 'Range Bound' : projectedTarget.toFixed(1)}
                </div>
                <div className="text-rose-300 font-semibold text-[10px]">
                  Guard Stop: {signal === 'WAIT' ? 'Awaiting Break' : projectedStop.toFixed(1)}
                </div>
              </div>
            </div>

            <div className="relative z-10 flex justify-between items-end">
              <div className="bg-black/80 backdrop-blur-md border border-amber-500/30 px-3 py-1 rounded-lg text-[10px] text-amber-300 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Trajectory: {signal === 'CALL' ? 'BULLISH EXPANSION' : signal === 'PUT' ? 'BEARISH CRUSH' : 'RANGE CONFINEMENT'}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono bg-black/70 px-2 py-0.5 rounded">
                Live LTP: {ltp ? ltp.toFixed(2) : '—'}
              </div>
            </div>
          </div>
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

  const totalHits = rows.filter((r) => r.status === 'HIT').length
  const totalMisses = rows.filter((r) => r.status === 'MISS').length
  const grossWinPts = rows.filter((r) => r.pnlPoints > 0).reduce((acc, r) => acc + r.pnlPoints, 0)
  const grossLossPts = Math.abs(rows.filter((r) => r.pnlPoints < 0).reduce((acc, r) => acc + r.pnlPoints, 0))
  const profitFactor = grossLossPts > 0 ? (grossWinPts / grossLossPts).toFixed(2) : grossWinPts > 0 ? '∞' : '0.00'
  const netPoints = (grossWinPts - grossLossPts).toFixed(1)

  return (
    <div className="space-y-5">
      <div className={`${imperialWindow} p-6 flex justify-between items-center flex-wrap gap-4 border-amber-500/40`}>
        <div>
          <div className="text-amber-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
            <Scroll className="w-4 h-4" /> Imperial Archives (Last 5 Sessions)
          </div>
          <h2 className="text-2xl font-serif font-bold text-amber-100 mt-1">Royal Audit Ledger</h2>
        </div>
        <div className="flex gap-6">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-amber-400/80">Imperial Profit Factor</div>
            <div className={`text-2xl font-black ${(profitFactor === '∞' || Number(profitFactor) >= 1.3) ? 'text-emerald-400' : 'text-amber-300'}`}>
              {profitFactor}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-amber-400/80">Net Points Captured</div>
            <div className={`text-2xl font-black ${Number(netPoints) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {Number(netPoints) > 0 ? `+${netPoints}` : netPoints}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className={`${royalCard} p-4 text-xs`}>
          <div className="font-bold text-amber-400 uppercase tracking-wider mb-2">Self-Tuning Governors</div>
          <div className="space-y-1 text-slate-300">
            <div>Chop Restraint Weight: {weights.preferWaitInChop}</div>
            <div>Breakout Threshold Multiplier: {weights.requireStrongerBreak}</div>
            <div>Protection Pad Expansion: {weights.widenStop}</div>
          </div>
        </div>
        <div className={`${royalCard} p-4 text-xs md:col-span-2 flex flex-col justify-center`}>
          <div className="font-bold text-amber-400 uppercase tracking-wider mb-2">Aggregate Campaign Summary</div>
          <div className="flex gap-8 text-sm">
            <div>Total Hits: <span className="font-bold text-emerald-400">{totalHits}</span></div>
            <div>Total Misses: <span className="font-bold text-rose-400">{totalMisses}</span></div>
            <div>Win Precision: <span className="font-bold text-amber-300">{rows.length ? Math.round((totalHits / rows.length) * 100) : 0}%</span></div>
          </div>
        </div>
      </div>

      {days.map((day) => {
        const list = byDay[day]
        const dayHits = list.filter((r) => r.status === 'HIT').length
        const dayMiss = list.filter((r) => r.status === 'MISS').length
        const dayPts = list.reduce((acc, r) => acc + (r.pnlPoints || 0), 0)

        return (
          <div key={day} className={`${royalCard} overflow-hidden border border-amber-500/30`}>
            <div className="px-5 py-3 bg-gradient-to-r from-amber-950/80 to-slate-900 border-b border-amber-500/20 flex flex-wrap justify-between text-xs font-bold">
              <span className="text-amber-300 font-serif tracking-wider">{day}</span>
              <div className="flex gap-4">
                <span className="text-emerald-400">HIT {dayHits}</span>
                <span className="text-rose-400">MISS {dayMiss}</span>
                <span className={dayPts >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {dayPts >= 0 ? `+${dayPts.toFixed(1)}` : dayPts.toFixed(1)} pts
                </span>
              </div>
            </div>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="text-amber-400/70 sticky top-0 bg-slate-950 border-b border-amber-500/20">
                  <tr>
                    <th className="p-2.5">Time</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">H</th>
                    <th className="p-2.5">Bias</th>
                    <th className="p-2.5">Entry</th>
                    <th className="p-2.5">Exit</th>
                    <th className="p-2.5">Pts</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">MFE / MAE</th>
                    <th className="p-2.5">Reason / Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-500/10">
                  {list.map((r) => (
                    <tr key={r.id} className={r.status === 'HIT' ? 'bg-emerald-950/20' : r.status === 'MISS' ? 'bg-rose-950/20' : ''}>
                      <td className="p-2.5 text-slate-400 font-mono">
                        {new Date(r.resolvedAt).toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' })}
                      </td>
                      <td className="p-2.5">{r.kind}</td>
                      <td className="p-2.5 font-bold text-amber-400">{r.horizon}</td>
                      <td className="p-2.5 font-black">{r.direction}</td>
                      <td className="p-2.5">{r.entryPrice.toFixed(1)}</td>
                      <td className="p-2.5">{r.exitPrice.toFixed(1)}</td>
                      <td className={`p-2.5 font-bold ${r.pnlPoints >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {r.pnlPoints >= 0 ? `+${r.pnlPoints.toFixed(1)}` : r.pnlPoints.toFixed(1)}
                      </td>
                      <td className={`p-2.5 font-black ${r.status === 'HIT' ? 'text-emerald-400' : r.status === 'MISS' ? 'text-rose-400' : 'text-amber-400'}`}>
                        {r.status}
                      </td>
                      <td className="p-2.5 text-slate-400 font-mono">
                        {r.mfe != null ? `+${r.mfe.toFixed(0)} / -${r.mae?.toFixed(0)}` : '—'}
                      </td>
                      <td className="p-2.5 text-slate-300">{r.status === 'MISS' ? r.failReason : r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const FoDecisionDesk: React.FC = () => {
  const [symbol, setSymbol] = useState<SymbolKey>('NIFTY')
  // Track live rates for NIFTY, SENSEX, and BANKNIFTY in memory
  const [prices, setPrices] = useState<Record<SymbolKey, number | null>>({ NIFTY: null, SENSEX: null, BANKNIFTY: null })
  const [orbInputs, setOrbInputs] = useState<Record<SymbolKey, { high: string; low: string }>>(() =>
    loadJSON(ORB_KEY, {
      NIFTY: { high: '', low: '' },
      SENSEX: { high: '', low: '' },
      BANKNIFTY: { high: '', low: '' },
    })
  )
  const [isBridgeOnline, setIsBridgeOnline] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('--:--:--')
  const [err, setErr] = useState('')
  const [now, setNow] = useState(Date.now())
  const [activeLocks, setActiveLocks] = useState<Record<string, ActiveLock>>(() => loadJSON(LOCKS_KEY, {}))
  const [scorecard, setScorecard] = useState<ScorecardRecord[]>(() => pruneWorkingDays(loadJSON(SCORE_KEY, [])))
  const [audits, setAudits] = useState<AuditPending[]>(() => loadJSON(AUDIT_KEY, []))

  const sustainedTicks = useRef<Record<SymbolKey, number>>({ NIFTY: 0, SENSEX: 0, BANKNIFTY: 0 })

  useEffect(() => {
    localStorage.setItem(ORB_KEY, JSON.stringify(orbInputs))
  }, [orbInputs])
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

  // Poll Snapshot Endpoint for NIFTY, SENSEX, and BANKNIFTY
  const fetchSnapshot = useCallback(async () => {
    if (!BRIDGE_URL) {
      setIsBridgeOnline(false)
      setErr('Set VITE_ANGEL_BRIDGE_URL on Vercel')
      return
    }
    try {
      const res = await fetch(`${BRIDGE_URL}/snapshot`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      let nLtp: number | null = null
      let sLtp: number | null = null
      let bnLtp: number | null = null

      if (data.ltp && typeof data.ltp === 'object') {
        nLtp = Number(data.ltp.NIFTY) || null
        sLtp = Number(data.ltp.SENSEX) || null
        bnLtp = Number(data.ltp.BANKNIFTY) || null
      }
      if (!nLtp && data.nifty?.ltp) nLtp = Number(data.nifty.ltp)
      if (!sLtp && data.sensex?.ltp) sLtp = Number(data.sensex.ltp)
      if (!bnLtp && data.bankNifty?.ltp) bnLtp = Number(data.bankNifty.ltp)

      // Fallback synthetic Sensex estimate if bridge only tracks Nifty
      if (!sLtp && nLtp) {
        sLtp = Number((nLtp * 3.28).toFixed(2))
      }

      if ((nLtp && nLtp > 0) || (sLtp && sLtp > 0)) {
        setPrices({ NIFTY: nLtp, SENSEX: sLtp, BANKNIFTY: bnLtp })
        setIsBridgeOnline(true)
        setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' }))
        setErr('')
      } else {
        setIsBridgeOnline(false)
        setErr(data.error || 'Empty Snapshot Response')
      }
    } catch (e) {
      setIsBridgeOnline(false)
      setErr(String(e))
    }
  }, [])

  useEffect(() => {
    void fetchSnapshot()
    const t = setInterval(() => void fetchSnapshot(), 2000)
    return () => clearInterval(t)
  }, [fetchSnapshot])

  const liveLtp = prices[symbol]
  const currentOrb = orbInputs[symbol] || { high: '', low: '' }
  const orbHigh = parseFloat(currentOrb.high)
  const orbLow = parseFloat(currentOrb.low)
  const hasOrb = !Number.isNaN(orbHigh) && !Number.isNaN(orbLow) && orbHigh > orbLow

  const session = getSessionStatus(now)
  const weights = loadWeights()

  // Dynamic Breakout Buffers
  const mult = symbol === 'BANKNIFTY' ? 2.5 : symbol === 'SENSEX' ? 3.0 : 1.0
  const range = hasOrb ? orbHigh - orbLow : 0
  const baseBuffer = Math.max(6 * mult, range * 0.08)
  const totalBuffer = baseBuffer + (weights.requireStrongerBreak > 2 ? 4 * mult : 0)

  // Sustained Tick Confirmation Engine
  useEffect(() => {
    if (!liveLtp || !hasOrb) return
    if (liveLtp >= orbHigh + totalBuffer) {
      sustainedTicks.current[symbol] = Math.max(1, sustainedTicks.current[symbol] + 1)
    } else if (liveLtp <= orbLow - totalBuffer) {
      sustainedTicks.current[symbol] = Math.min(-1, sustainedTicks.current[symbol] - 1)
    } else {
      sustainedTicks.current[symbol] = 0
    }
  }, [liveLtp, orbHigh, orbLow, totalBuffer, symbol, hasOrb])

  const deriveSignal = (): SignalType => {
    if (!liveLtp || !hasOrb || !session.canLock) return 'WAIT'
    if (liveLtp >= orbHigh + totalBuffer && sustainedTicks.current[symbol] >= 2) return 'CALL'
    if (liveLtp <= orbLow - totalBuffer && sustainedTicks.current[symbol] <= -2) return 'PUT'
    return 'WAIT'
  }
  const signal = deriveSignal()

  const pushScore = useCallback((row: ScorecardRecord) => {
    setScorecard((prev) => pruneWorkingDays([row, ...prev]).slice(0, 500))
    if (row.status === 'MISS') bumpWeight(row.failReason)
  }, [])

  // Lock Resolution Engine across all assets
  useEffect(() => {
    const t = Date.now()
    setActiveLocks((prevLocks) => {
      let changed = false
      const remaining: Record<string, ActiveLock> = {}

      Object.entries(prevLocks).forEach(([key, lock]) => {
        const px = prices[lock.symbol]
        if (!px) {
          remaining[key] = lock
          return
        }

        const delta = lock.direction === 'CALL' ? px - lock.entryPrice : lock.entryPrice - px
        lock.maxFavorable = Math.max(lock.maxFavorable || 0, delta)
        lock.maxAdverse = Math.max(lock.maxAdverse || 0, -delta)

        let done = false
        let status: ScorecardRecord['status'] = 'MISS'
        let reason: FailReason = 'UNKNOWN'
        let note = ''
        let pnlPoints = delta

        if (lock.direction === 'CALL') {
          if (px >= lock.targetPrice) {
            done = true
            status = 'HIT'
            reason = 'NONE'
            note = 'Target Conquered'
            pnlPoints = lock.targetPrice - lock.entryPrice
          } else if (px <= lock.stopPrice) {
            done = true
            status = 'MISS'
            reason = 'STOPPED'
            note = 'Stop Triggered'
            pnlPoints = lock.stopPrice - lock.entryPrice
          } else if (t >= lock.expiresAt) {
            done = true
            if (delta > 3 * mult) {
              status = 'HIT'
              reason = 'NONE'
              note = 'Time Expired Green'
            } else if (Math.abs(delta) <= 3 * mult) {
              status = 'FLAT'
              reason = 'CHOP'
              note = 'Choppy Exit'
            } else {
              status = 'MISS'
              reason = 'TIME_WRONG_SIDE'
              note = 'Time Expired Reverse'
            }
          }
        } else {
          if (px <= lock.targetPrice) {
            done = true
            status = 'HIT'
            reason = 'NONE'
            note = 'Target Conquered'
            pnlPoints = lock.entryPrice - lock.targetPrice
          } else if (px >= lock.stopPrice) {
            done = true
            status = 'MISS'
            reason = 'STOPPED'
            note = 'Stop Triggered'
            pnlPoints = lock.entryPrice - lock.stopPrice
          } else if (t >= lock.expiresAt) {
            done = true
            if (delta > 3 * mult) {
              status = 'HIT'
              reason = 'NONE'
              note = 'Time Expired Green'
            } else if (Math.abs(delta) <= 3 * mult) {
              status = 'FLAT'
              reason = 'CHOP'
              note = 'Choppy Exit'
            } else {
              status = 'MISS'
              reason = 'TIME_WRONG_SIDE'
              note = 'Time Expired Reverse'
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
            exitPrice: px,
            targetPrice: lock.targetPrice,
            stopPrice: lock.stopPrice,
            pnlPoints,
            status,
            failReason: reason,
            note,
            lockedAt: lock.lockedAt,
            resolvedAt: t,
            dayKey: istDayKey(lock.lockedAt),
            mfe: lock.maxFavorable,
            mae: lock.maxAdverse,
          })
        } else {
          remaining[key] = lock
        }
      })

      return changed ? remaining : prevLocks
    })
  }, [prices, now, pushScore, mult])

  // 45m Auto-Audit Engine
  useEffect(() => {
    if (!liveLtp || !isBridgeOnline) return
    const t = Date.now()

    setAudits((prevAudits) => {
      const stillPending: AuditPending[] = []
      prevAudits.forEach((a) => {
        const px = prices[a.symbol]
        if (t < a.expiresAt || !px) {
          stillPending.push(a)
          return
        }

        let status: ScorecardRecord['status'] = 'FLAT'
        let reason: FailReason = 'CHOP'
        const delta = a.signal === 'CALL' ? px - a.entryPrice : a.entryPrice - px

        if (a.signal === 'WAIT') {
          status = 'SKIP'
          reason = 'NO_BREAKOUT'
        } else if (delta >= 10 * mult) {
          status = 'HIT'
          reason = 'NONE'
        } else if (delta <= -10 * mult) {
          status = 'MISS'
          reason = 'TIME_WRONG_SIDE'
        }

        pushScore({
          id: `${a.id}_audit_done`,
          kind: 'AUDIT45',
          horizon: '45m',
          symbol: a.symbol,
          direction: a.signal,
          entryPrice: a.entryPrice,
          exitPrice: px,
          pnlPoints: a.signal === 'WAIT' ? 0 : delta,
          status,
          failReason: reason,
          note: `45m Shastra Cycle Complete`,
          lockedAt: a.lockedAt,
          resolvedAt: t,
          dayKey: a.dayKey,
        })
      })
      return stillPending
    })

    const activeAudit = audits.find((a) => a.symbol === symbol && a.expiresAt > t)
    if (!activeAudit && session.canLock) {
      setAudits((prev) => [
        ...prev,
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
    }
  }, [liveLtp, isBridgeOnline, symbol, now, prices, session.canLock, signal, pushScore, audits, mult])

  const handleLockHorizon = (horizon: HorizonKey) => {
    if (!liveLtp || !isBridgeOnline) {
      setErr('Imperial bridge offline: Live price feed required.')
      return
    }
    if (signal === 'WAIT') {
      setErr('Chanakya Mandate: Range unbroken. Wait for confirmation buffer.')
      return
    }

    const rule = HORIZON_RULES[horizon]
    const stopExtra = weights.widenStop > 2 ? 1.15 : 1
    const td = rule.targetPts * mult
    const sd = rule.stopPts * mult * stopExtra
    const targetPrice = signal === 'CALL' ? liveLtp + td : liveLtp - td
    const stopPrice = signal === 'CALL' ? liveLtp - sd : liveLtp + sd

    setActiveLocks((prev) => ({
      ...prev,
      [`${symbol}_${horizon}`]: {
        id: `${symbol}_${horizon}_${Date.now()}`,
        horizon,
        symbol,
        entryPrice: liveLtp,
        targetPrice: Number(targetPrice.toFixed(2)),
        stopPrice: Number(stopPrice.toFixed(2)),
        direction: signal,
        lockedAt: Date.now(),
        expiresAt: Date.now() + rule.durationMs,
        maxFavorable: 0,
        maxAdverse: 0,
      },
    }))
    setErr('')
  }

  const hits = scorecard.filter((s) => s.status === 'HIT').length
  const misses = scorecard.filter((s) => s.status === 'MISS').length
  const pendingAudit = audits.find((a) => a.symbol === symbol && a.expiresAt > now)

  return (
    <div className="space-y-6">
      <ChanakyaAdvisorAvatar signal={signal} sessionLabel={session.label} />

      {/* Top Asset Selector & Imperial Header */}
      <div className={`${imperialWindow} p-4 flex flex-col lg:flex-row gap-4 justify-between items-center border-amber-500/40`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-black/60 p-1.5 rounded-2xl border border-amber-500/30">
            {(['NIFTY', 'SENSEX', 'BANKNIFTY'] as SymbolKey[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSymbol(s)}
                className={`px-5 py-2 rounded-xl text-xs font-black tracking-wider transition-all ${
                  symbol === s
                    ? goldPill
                    : 'text-amber-200/70 hover:text-amber-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="px-3">
            <div className="text-[9px] text-amber-400 font-bold uppercase tracking-widest">Imperial Live LTP</div>
            <div className="text-2xl font-black text-amber-100 font-mono">
              {liveLtp != null ? liveLtp.toFixed(2) : '—'}
            </div>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
              isBridgeOnline
                ? 'bg-emerald-950/70 border-emerald-400/80 text-emerald-300'
                : 'bg-rose-950/70 border-rose-400/80 text-rose-300'
            }`}
          >
            {isBridgeOnline ? `ONLINE ${lastUpdated}` : 'BRIDGE DISCONNECTED'}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void fetchSnapshot()}
          className="self-center p-2.5 rounded-xl border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {err ? (
        <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-950/70 border border-rose-500/50 rounded-xl px-4 py-2.5 shadow-lg">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{err}</span>
        </div>
      ) : null}

      {/* Tactical Range & Regime Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`${royalCard} p-3.5 border-emerald-500/30`}>
          <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Fortress High (ORB)</div>
          <input
            type="number"
            className="mt-1.5 w-full rounded-xl border border-emerald-500/40 bg-black/60 px-3 py-1.5 text-emerald-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-400"
            value={currentOrb.high}
            onChange={(e) =>
              setOrbInputs((prev) => ({ ...prev, [symbol]: { ...prev[symbol], high: e.target.value } }))
            }
            placeholder="High after 9:30"
          />
        </div>
        <div className={`${royalCard} p-3.5 border-rose-500/30`}>
          <div className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">Fortress Low (ORB)</div>
          <input
            type="number"
            className="mt-1.5 w-full rounded-xl border border-rose-500/40 bg-black/60 px-3 py-1.5 text-rose-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-rose-400"
            value={currentOrb.low}
            onChange={(e) =>
              setOrbInputs((prev) => ({ ...prev, [symbol]: { ...prev[symbol], low: e.target.value } }))
            }
            placeholder="Low after 9:30"
          />
        </div>
        <div className={`${royalCard} p-3.5`}>
          <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">45m Shastra Cycle</div>
          <div className="text-xs font-bold text-amber-100 mt-2 flex items-center gap-1.5 font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            {pendingAudit
              ? `${pendingAudit.signal} · ${Math.max(0, Math.floor((pendingAudit.expiresAt - now) / 60000))}m left`
              : 'Window Pending'}
          </div>
        </div>
        <div className={`${royalCard} p-3.5`}>
          <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Campaign Scorecard</div>
          <div className="mt-1 flex items-center gap-3 text-sm font-black font-mono">
            <span className="text-emerald-400">{hits} HIT</span>
            <span className="text-amber-500/40">/</span>
            <span className="text-rose-400">{misses} MISS</span>
          </div>
        </div>
      </div>

      {/* CLEAR EXECUTION RANGE CRITERIA DISPLAY */}
      <div className={`${royalCard} p-4 border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-black/80 to-amber-950/40 flex flex-col md:flex-row justify-between items-center gap-4 text-xs`}>
        <div>
          <div className="font-bold uppercase tracking-widest text-amber-400">Clear Execution Trigger Zones</div>
          <div className="text-slate-300 mt-0.5">
            Buffer Required: <span className="font-mono font-bold text-amber-300">±{totalBuffer.toFixed(1)} pts</span> | Confirmation: <span className="font-bold text-amber-300">2 sustained ticks</span>
          </div>
        </div>
        <div className="flex items-center gap-3 font-mono font-bold text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
            CALL: {hasOrb ? `> ${(orbHigh + totalBuffer).toFixed(1)}` : 'Set ORB'}
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-300">
            WAIT: Inside Fortress
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300">
            PUT: {hasOrb ? `< ${(orbLow - totalBuffer).toFixed(1)}` : 'Set ORB'}
          </div>
        </div>
      </div>

      {/* HORIZONS LOCK MATRIX */}
      <div className={`${imperialWindow} overflow-hidden border-amber-500/40`}>
        <div className="px-5 py-3.5 bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-b border-amber-500/30 flex flex-wrap justify-between items-center gap-2">
          <span className="text-xs font-serif font-black text-amber-200 uppercase tracking-widest flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-amber-400" /> Tactical Campaign Horizons · 5 / 10 / 15 / 30 Min
          </span>
          <span className="text-[11px] text-amber-300/80 font-mono">Locks active only on verified breakout</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-amber-500/20">
          {(['5m', '10m', '15m', '30m'] as HorizonKey[]).map((hz) => {
            const rule = HORIZON_RULES[hz]
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

            return (
              <div
                key={hz}
                className={`p-4 space-y-2.5 ${
                  signal === 'CALL' ? 'bg-emerald-950/10' : signal === 'PUT' ? 'bg-rose-950/10' : 'bg-black/20'
                }`}
              >
                <div className="flex justify-between text-xs font-black">
                  <span className="text-amber-200 tracking-wider">{hz} Horizon</span>
                  <span className={signal === 'CALL' ? 'text-emerald-400' : signal === 'PUT' ? 'text-rose-400' : 'text-amber-400'}>
                    {signal}
                  </span>
                </div>
                {lock ? (
                  <div className="text-[11px] space-y-1 rounded-2xl border border-amber-500/40 bg-black/80 p-3 shadow-md">
                    <div className="font-bold text-amber-300">ACTIVE {lock.direction}</div>
                    <div className="font-mono text-slate-300">Entry: {lock.entryPrice.toFixed(1)}</div>
                    <div className="text-emerald-400 font-mono">Target: {lock.targetPrice}</div>
                    <div className="text-rose-400 font-mono">Stop: {lock.stopPrice}</div>
                    <div className="text-amber-400/80 font-mono text-[10px]">
                      {Math.max(0, Math.floor((lock.expiresAt - now) / 1000))}s remaining
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-[11px] rounded-xl border border-amber-500/20 bg-black/50 p-2 space-y-1 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Target</span>
                        <span className="text-emerald-400 font-bold">{tgt}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Guard</span>
                        <span className="text-rose-400 font-bold">{stp}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!isBridgeOnline || !liveLtp || signal === 'WAIT' || !session.canLock}
                      onClick={() => handleLockHorizon(hz)}
                      className="w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 shadow-lg shadow-amber-500/20 uppercase tracking-wider"
                    >
                      <Play className="w-3 h-3 fill-current" /> Lock {hz}
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* DUAL SCREENS: LIVE NIFTY & SENSEX WITH PREDICTED TRAJECTORY */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <RoyalDualChartDesk
          symbol="NIFTY"
          signal={deriveSignal()}
          ltp={prices.NIFTY}
          orbHigh={parseFloat(orbInputs.NIFTY.high)}
          orbLow={parseFloat(orbInputs.NIFTY.low)}
          targetPts={HORIZON_RULES['15m'].targetPts}
          stopPts={HORIZON_RULES['15m'].stopPts}
        />
        <RoyalDualChartDesk
          symbol="SENSEX"
          signal={deriveSignal()}
          ltp={prices.SENSEX}
          orbHigh={parseFloat(orbInputs.SENSEX.high)}
          orbLow={parseFloat(orbInputs.SENSEX.low)}
          targetPts={HORIZON_RULES['15m'].targetPts * 3.0}
          stopPts={HORIZON_RULES['15m'].stopPts * 3.0}
        />
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
        className={`${royalCard} p-3 flex gap-2`}
        onSubmit={(e) => {
          e.preventDefault()
          const c = input.trim().toUpperCase().replace(/\.NS$/i, '')
          if (c) {
            setSym(c)
            setInput('')
          }
        }}
      >
        <Search className="w-4 h-4 text-amber-400 mt-2.5 ml-2" />
        <input
          className="flex-1 rounded-xl border border-amber-500/30 bg-black/60 px-3 py-2 text-sm text-amber-100 placeholder-slate-500 focus:outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter NSE Symbol (e.g. TATASTEEL, INFY)"
        />
        <button type="submit" className={`px-5 rounded-xl text-xs font-bold ${goldPill}`}>
          Consult Chart
        </button>
      </form>
      <div className={`${royalCard} p-3`}>
        <RealTradingViewChart symbol={`NSE:${sym}`} height={480} />
      </div>
    </div>
  )
}

export const RealTradingViewChart: React.FC<{ symbol: string; height?: number }> = ({ symbol, height = 380 }) => {
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
    const tv = symbol.includes('BANKNIFTY')
      ? 'NSE:BANKNIFTY'
      : symbol.includes('SENSEX')
        ? 'BSE:SENSEX'
        : symbol.includes(':')
          ? symbol
          : `NSE:${symbol}`
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tv,
      interval: '5',
      timezone: 'Asia/Kolkata',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: '#0a0907',
      gridColor: 'rgba(217, 119, 6, 0.08)',
      enable_publishing: false,
    })
    el.appendChild(script)
    return () => { el.innerHTML = '' }
  }, [symbol, height])
  return <div ref={ref} style={{ height }} className="w-full rounded-2xl overflow-hidden border border-amber-500/30" />
}

export const InstitutionalFlowsDesk = () => (
  <div className={`${royalCard} p-6 text-sm text-slate-300`}>
    Official Exchange Participant Flows:{' '}
    <a className="text-amber-400 font-bold underline ml-1" href="https://www.nseindia.com/reports/fii-dii" target="_blank" rel="noreferrer">
      NSE Official FII / DII Ledger
    </a>
  </div>
)

export const VisualNewsWireDesk = () => (
  <div className="space-y-4">
    <div className={`${imperialWindow} p-5 border-amber-500/40`}>
      <h2 className="font-serif text-xl font-bold text-amber-200">Shastra Strategic Calendar</h2>
      <p className="text-xs text-amber-400/80">Macro catalytic events requiring disciplined risk reduction.</p>
    </div>
    <div className="grid md:grid-cols-2 gap-4">
      {[
        ['Weekly Expiry Day', 'Severe gamma spikes and theta acceleration post 13:30 IST.'],
        ['RBI MPC / Monetary Policy', 'Extreme interest rate volatility. Enforce WAIT 45m before and after the event.'],
        ['Union Budget / Election Results', 'Historical IV inflation. Static target and stop distances should be doubled.'],
        ['Global Catalysts (Fed / US CPI)', 'Expect significant opening gap imbalances at 09:15 IST.'],
      ].map(([t, d]) => (
        <div key={t} className={`${royalCard} p-4 border border-amber-500/30`}>
          <div className="text-xs font-bold text-amber-400 uppercase tracking-widest">{t}</div>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">{d}</p>
        </div>
      ))}
    </div>
  </div>
)

export const SectorEtfMatrix = () => (
  <div className={`${royalCard} p-6 text-sm text-amber-200`}>
    Core Liquid Wealth Instruments: NIFTYBEES · BANKBEES · ITBEES · GOLDBEES · SILVERBEES
  </div>
)

export const RiskProtocolDesk = () => (
  <div className={`${imperialWindow} p-6 text-sm text-slate-200 space-y-3 border-amber-500/40`}>
    <div className="flex items-center gap-2 font-bold text-amber-400 text-base font-serif">
      <ShieldCheck className="w-5 h-5 text-amber-400" /> Chanakya Wealth Preservation Doctrines
    </div>
    <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-300">
      <li>Strict limit: Maximum 1 active horizon lock per asset at any time[cite: 3].</li>
      <li>Never force an entry during the 09:15–09:30 range formation cycle[cite: 3].</li>
      <li>After 3 consecutive losses, enforce capital quarantine until the next session[cite: 3].</li>
    </ul>
  </div>
)

export default FoDecisionDesk