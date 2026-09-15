import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  RefreshCw,
  Play,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Clock,
  Search,
  ShieldCheck,
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
export type SessionPhase = 'PREOPEN' | 'ORB' | 'MOMENTUM' | 'CHOP' | 'LATE' | 'CLOSED'

const HORIZON_RULES: Record<HorizonKey, { durationMs: number; targetPts: number; stopPts: number }> = {
  '5m': { durationMs: 5 * 60 * 1000, targetPts: 18, stopPts: 12 },
  '10m': { durationMs: 10 * 60 * 1000, targetPts: 30, stopPts: 20 },
  '15m': { durationMs: 15 * 60 * 1000, targetPts: 45, stopPts: 28 },
  '30m': { durationMs: 30 * 60 * 1000, targetPts: 70, stopPts: 40 },
}

const AUDIT_MS = 45 * 60 * 1000
const CONFIRM_POLLS = 2
const MIN_ORB_WIDTH = 5
const LOCKS_KEY = 'novaforge_active_locks_v7'
const SCORE_KEY = 'novaforge_scorecard_v7'
const AUDIT_KEY = 'novaforge_audit_v7'
const ORB_KEY = 'novaforge_manual_orb_v7'
const WEIGHTS_KEY = 'novaforge_rule_weights_v7'

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
}

interface ScorecardRecord {
  id: string
  kind: 'LOCK' | 'AUDIT45'
  horizon: HorizonKey | '45m'
  symbol: SymbolKey
  direction: SignalType
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
  sessionPhase?: SessionPhase | 'UNKNOWN'
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

interface Weights {
  requireStrongerBreak: number
  widenStop: number
  preferWaitOnChop: number
}

interface BreakoutState {
  above: number
  below: number
}

const card = 'rounded-2xl border border-slate-200 bg-white shadow-sm'
const frame = 'rounded-2xl border border-slate-200 bg-slate-50'

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

function loadWeights(): Weights {
  return loadJSON(WEIGHTS_KEY, { requireStrongerBreak: 0, widenStop: 0, preferWaitOnChop: 0 })
}


function requestNotifyPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission === 'default') {
    void Notification.requestPermission()
  }
}

function notifyTradeSignal(signal: 'CALL' | 'PUT', symbol: string, ltp: number) {
  const title = `Novaforge · ${signal} · ${symbol}`
  const body = `LTP ${ltp.toFixed(1)} · confirmed break · open desk to LOCK`
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, tag: `nf-${symbol}-${signal}` })
    }
  } catch {
    /* ignore */
  }
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g)
    g.connect(ctx.destination)
    o.frequency.value = signal === 'CALL' ? 880 : 440
    g.gain.value = 0.08
    o.start()
    setTimeout(() => {
      o.stop()
      void ctx.close()
    }, 180)
  } catch {
    /* ignore */
  }
}

function bumpWeight(reason: FailReason) {
  const w = loadWeights()
  if (reason === 'CHOP' || reason === 'NO_BREAKOUT') w.preferWaitOnChop = Math.min(5, w.preferWaitOnChop + 1)
  if (reason === 'STOPPED') w.widenStop = Math.min(5, w.widenStop + 1)
  if (reason === 'TIME_WRONG_SIDE') w.requireStrongerBreak = Math.min(5, w.requireStrongerBreak + 1)
  localStorage.setItem(WEIGHTS_KEY, JSON.stringify(w))
}

function getSessionInfo(nowTs = Date.now()) {
  const ist = new Date(nowTs).toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false })
  const [hh, mm] = ist.split(':').map(Number)
  const mins = hh * 60 + mm
  let phase: SessionPhase = 'CLOSED'
  let label = 'Market closed'
  let safeToTrade = false
  if (mins >= 9 * 60 + 15 && mins < 15 * 60 + 30) {
    if (mins < 9 * 60 + 30) {
      phase = 'ORB'
      label = 'ORB forming — wait till 9:30'
    } else if (mins >= 11 * 60 + 30 && mins < 13 * 60) {
      phase = 'CHOP'
      label = 'Midday chop — low conviction'
    } else if (mins >= 14 * 60 + 45) {
      phase = 'LATE'
      label = 'Late session — no new risk'
    } else {
      phase = 'MOMENTUM'
      label = 'Prime window'
      safeToTrade = true
    }
  } else if (mins < 9 * 60 + 15) {
    phase = 'PREOPEN'
    label = 'Pre-open'
  }
  // Do not edit ORB while range is still forming
  const orbEditable = phase !== 'ORB'
  return { phase, label, safeToTrade, orbEditable, mins }
}

function rollingStdev(samples: number[]): number {
  if (samples.length < 5) return 0
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length
  const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length
  return Math.sqrt(variance)
}

function symbolMult(symbol: SymbolKey) {
  if (symbol === 'BANKNIFTY') return 2.5
  if (symbol === 'SENSEX') return 3.0
  return 1.0
}

function tvSymbol(symbol: string) {
  if (symbol.includes('BANKNIFTY')) return 'NSE:BANKNIFTY'
  if (symbol.includes('SENSEX')) return 'BSE:SENSEX'
  if (symbol.includes(':')) return symbol
  return `NSE:${symbol}`
}

function computeMetrics(rows: ScorecardRecord[]) {
  const locks = rows.filter((r) => r.kind === 'LOCK' && r.status !== 'SKIP')
  const wins = locks.filter((r) => r.status === 'HIT')
  const losses = locks.filter((r) => r.status === 'MISS')
  const total = locks.length
  const hitRate = total ? Math.round((wins.length / total) * 100) : 0
  const avgWin = wins.length ? wins.reduce((s, r) => s + r.pnlPoints, 0) / wins.length : 0
  const avgLoss = losses.length
    ? Math.abs(losses.reduce((s, r) => s + r.pnlPoints, 0) / losses.length)
    : 0
  const grossWin = wins.reduce((s, r) => s + Math.max(0, r.pnlPoints), 0)
  const grossLoss = Math.abs(losses.reduce((s, r) => s + Math.min(0, r.pnlPoints), 0))
  const pf = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0
  const expectancy =
    total > 0
      ? (wins.length / total) * avgWin - (losses.length / total) * avgLoss
      : 0
  return { total, hits: wins.length, misses: losses.length, hitRate, avgWin, avgLoss, pf, expectancy }
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
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol(symbol),
      interval: '5',
      timezone: 'Asia/Kolkata',
      theme: 'light',
      style: '1',
      locale: 'en',
      enable_publishing: false,
    })
    el.appendChild(script)
    return () => {
      el.innerHTML = ''
    }
  }, [symbol, height])
  return <div ref={ref} style={{ height }} className="w-full rounded-xl overflow-hidden border border-slate-200" />
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

  const m = computeMetrics(rows)
  const byDay = rows.reduce<Record<string, ScorecardRecord[]>>((acc, r) => {
    ;(acc[r.dayKey] ||= []).push(r)
    return acc
  }, {})
  const days = Object.keys(byDay).sort().reverse()

  return (
    <div className="space-y-4">
      <div className={`${frame} p-5`}>
        <h2 className="text-xl font-bold text-slate-900">Report card · 5 working days</h2>
        <p className="text-xs text-slate-500 mt-1">All locks + 45m audits · HIT / MISS / FLAT</p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className={card + ' p-3'}>
            <div className="text-[10px] uppercase text-slate-500 font-bold">Hit rate</div>
            <div className="text-xl font-black text-slate-900">{m.hitRate}%</div>
            <div className="text-[11px] text-slate-500">
              {m.hits}H / {m.misses}M · {m.total} locks
            </div>
          </div>
          <div className={card + ' p-3'}>
            <div className="text-[10px] uppercase text-slate-500 font-bold">Expectancy</div>
            <div className={`text-xl font-black ${m.expectancy >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {m.expectancy >= 0 ? '+' : ''}
              {m.expectancy.toFixed(1)} pts
            </div>
          </div>
          <div className={card + ' p-3'}>
            <div className="text-[10px] uppercase text-slate-500 font-bold">Avg win / loss</div>
            <div className="text-sm font-bold">
              <span className="text-emerald-700">+{m.avgWin.toFixed(1)}</span>
              {' / '}
              <span className="text-rose-700">-{m.avgLoss.toFixed(1)}</span>
            </div>
          </div>
          <div className={card + ' p-3'}>
            <div className="text-[10px] uppercase text-slate-500 font-bold">Profit factor</div>
            <div className="text-xl font-black text-slate-900">
              {m.pf === Infinity ? '∞' : m.pf.toFixed(2)}
            </div>
          </div>
        </div>
        <div className="mt-3 text-[11px] text-slate-500">
          Self-tune · stronger break: {weights.requireStrongerBreak} · wider stop:{' '}
          {weights.widenStop} · wait-on-chop: {weights.preferWaitOnChop}
        </div>
      </div>

      {days.length === 0 ? (
        <div className={`${card} p-6 text-sm text-slate-500`}>No records yet. Lock trades on Trade Desk.</div>
      ) : (
        days.map((day) => {
          const list = byDay[day]
          const dm = computeMetrics(list)
          return (
            <div key={day} className={`${card} overflow-hidden`}>
              <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap gap-3 text-xs font-bold">
                <span>{day}</span>
                <span className="text-emerald-700">HIT {dm.hits}</span>
                <span className="text-rose-700">MISS {dm.misses}</span>
                <span>Exp {dm.expectancy >= 0 ? '+' : ''}{dm.expectancy.toFixed(1)}</span>
              </div>
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="text-slate-500 sticky top-0 bg-white border-b">
                    <tr>
                      <th className="p-2">Time</th>
                      <th className="p-2">Kind</th>
                      <th className="p-2">Sym</th>
                      <th className="p-2">H</th>
                      <th className="p-2">Side</th>
                      <th className="p-2">Entry</th>
                      <th className="p-2">Exit</th>
                      <th className="p-2">Pts</th>
                      <th className="p-2">Result</th>
                      <th className="p-2">Phase</th>
                      <th className="p-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {list.map((r) => (
                      <tr
                        key={r.id}
                        className={
                          r.status === 'HIT'
                            ? 'bg-emerald-50/50'
                            : r.status === 'MISS'
                              ? 'bg-rose-50/50'
                              : ''
                        }
                      >
                        <td className="p-2 text-slate-500">
                          {new Date(r.resolvedAt).toLocaleTimeString('en-IN', {
                            hour12: false,
                            timeZone: 'Asia/Kolkata',
                          })}
                        </td>
                        <td className="p-2">{r.kind}</td>
                        <td className="p-2">{r.symbol}</td>
                        <td className="p-2 font-semibold">{r.horizon}</td>
                        <td className="p-2 font-bold">{r.direction}</td>
                        <td className="p-2">{r.entryPrice.toFixed(1)}</td>
                        <td className="p-2">{r.exitPrice.toFixed(1)}</td>
                        <td
                          className={`p-2 font-black ${r.pnlPoints >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
                        >
                          {r.pnlPoints >= 0 ? '+' : ''}
                          {r.pnlPoints.toFixed(1)}
                        </td>
                        <td
                          className={`p-2 font-bold ${
                            r.status === 'HIT'
                              ? 'text-emerald-700'
                              : r.status === 'MISS'
                                ? 'text-rose-700'
                                : 'text-amber-700'
                          }`}
                        >
                          {r.status}
                        </td>
                        <td className="p-2 text-slate-500">{r.sessionPhase || '—'}</td>
                        <td className="p-2 text-slate-600">
                          {r.status === 'MISS' ? r.failReason : r.note}
                        </td>
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

export const FoDecisionDesk: React.FC = () => {
  const [symbol, setSymbol] = useState<SymbolKey>('NIFTY')
  const [prices, setPrices] = useState<Record<SymbolKey, number | null>>({
    NIFTY: null,
    SENSEX: null,
    BANKNIFTY: null,
  })
  const [orbInputs, setOrbInputs] = useState<Record<SymbolKey, { high: string; low: string }>>(() =>
    loadJSON(ORB_KEY, {
      NIFTY: { high: '', low: '' },
      SENSEX: { high: '', low: '' },
      BANKNIFTY: { high: '', low: '' },
    }),
  )
  const [isBridgeOnline, setIsBridgeOnline] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('--:--:--')
  const [err, setErr] = useState('')
  const [now, setNow] = useState(Date.now())
  const [activeLocks, setActiveLocks] = useState<Record<string, ActiveLock>>(() =>
    loadJSON(LOCKS_KEY, {}),
  )
  const [scorecard, setScorecard] = useState<ScorecardRecord[]>(() =>
    pruneWorkingDays(loadJSON(SCORE_KEY, [])),
  )
  const [audits, setAudits] = useState<AuditPending[]>(() => loadJSON(AUDIT_KEY, []))
  const breakoutRef = useRef<Record<SymbolKey, BreakoutState>>({
    NIFTY: { above: 0, below: 0 },
    SENSEX: { above: 0, below: 0 },
    BANKNIFTY: { above: 0, below: 0 },
  })
  const lastFetchOk = useRef(0)
  const ltpHistoryRef = useRef<Record<SymbolKey, number[]>>({
    NIFTY: [],
    SENSEX: [],
    BANKNIFTY: [],
  })
  const [allowOffSessionLock, setAllowOffSessionLock] = useState(false)
  /** AUTO = follow signal; CALL/PUT = user forces side anytime live LTP exists */
  const [lockMode, setLockMode] = useState<'AUTO' | 'CALL' | 'PUT'>('AUTO')
  const prevSignalRef = useRef<SignalType>('WAIT')
  const [notifyOn, setNotifyOn] = useState(
    () => typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted',
  )


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

  const fetchSnapshot = useCallback(async () => {
    if (!BRIDGE_URL) {
      setIsBridgeOnline(false)
      setErr('Set VITE_ANGEL_BRIDGE_URL on Vercel')
      return
    }
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 8000)
      const res = await fetch(`${BRIDGE_URL}/snapshot`, { cache: 'no-store', signal: ctrl.signal })
      clearTimeout(timer)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      let n: number | null = null
      let s: number | null = null
      let b: number | null = null
      if (data.ltp && typeof data.ltp === 'object') {
        n = Number(data.ltp.NIFTY) || null
        s = Number(data.ltp.SENSEX) || null
        b = Number(data.ltp.BANKNIFTY) || null
      }
      if (!n && data.nifty?.ltp) n = Number(data.nifty.ltp)
      if (!b && data.bankNifty?.ltp) b = Number(data.bankNifty.ltp)
      if (!s && data.sensex?.ltp) s = Number(data.sensex.ltp)
      if ((n && n > 0) || (b && b > 0) || (s && s > 0)) {
        setPrices({ NIFTY: n, SENSEX: s, BANKNIFTY: b })
        setIsBridgeOnline(true)
        lastFetchOk.current = Date.now()
        setLastUpdated(
          new Date().toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' }),
        )
        setErr('')
      } else {
        setIsBridgeOnline(false)
        setErr(data.error || 'Invalid LTP payload')
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

  // Stale feed warning
  useEffect(() => {
    if (isBridgeOnline && lastFetchOk.current && Date.now() - lastFetchOk.current > 30000) {
      setErr('Stale feed: no fresh snapshot >30s')
      setIsBridgeOnline(false)
    }
  }, [now, isBridgeOnline])

  const liveLtp = prices[symbol]
  useEffect(() => {
    if (liveLtp == null || liveLtp <= 0) return
    const arr = ltpHistoryRef.current[symbol]
    arr.push(liveLtp)
    if (arr.length > 40) arr.shift()
  }, [liveLtp, symbol])
  const currentOrb = orbInputs[symbol]
  const orbHigh = parseFloat(currentOrb.high)
  const orbLow = parseFloat(currentOrb.low)
  const hasOrb =
    !Number.isNaN(orbHigh) && !Number.isNaN(orbLow) && orbHigh > orbLow && orbHigh - orbLow >= MIN_ORB_WIDTH
  const session = getSessionInfo(now)
  const phase = session.phase
  const weights = loadWeights()
  const mult = symbolMult(symbol)
  const range = hasOrb ? orbHigh - orbLow : 0
  const vol = rollingStdev(ltpHistoryRef.current[symbol] || [])
  const volBuffer = vol > 0 ? Math.min(vol * 0.35, 25 * mult) : 0
  const buffer = hasOrb
    ? Math.max(6 * mult, range * 0.08, volBuffer) + (weights.requireStrongerBreak > 2 ? 4 * mult : 0)
    : 0

  // Update confirmation streaks when price changes
  useEffect(() => {
    if (!liveLtp || !hasOrb) return
    const st = breakoutRef.current[symbol]
    if (liveLtp >= orbHigh + buffer) {
      st.above = st.above + 1
      st.below = 0
    } else if (liveLtp <= orbLow - buffer) {
      st.below = st.below + 1
      st.above = 0
    } else {
      st.above = 0
      st.below = 0
    }
  }, [liveLtp, orbHigh, orbLow, buffer, symbol, hasOrb])

  const deriveSignal = (): SignalType => {
    if (!liveLtp || !hasOrb) return 'WAIT'
    if (phase === 'ORB' || phase === 'LATE' || phase === 'CLOSED' || phase === 'PREOPEN') return 'WAIT'
    if (phase === 'CHOP' && weights.preferWaitOnChop >= 4) return 'WAIT'
    const st = breakoutRef.current[symbol]
    if (st.above >= CONFIRM_POLLS) return 'CALL'
    if (st.below >= CONFIRM_POLLS) return 'PUT'
    return 'WAIT'
  }

  const signal = deriveSignal()
  const effectiveSide: SignalType =
    lockMode === 'AUTO' ? signal : lockMode

  // Alert when WAIT → CALL/PUT (tab must stay open)
  useEffect(() => {
    const prev = prevSignalRef.current
    if (prev === 'WAIT' && (signal === 'CALL' || signal === 'PUT') && liveLtp != null) {
      notifyTradeSignal(signal, symbol, liveLtp)
      document.title = `${signal} · ${symbol} · Novaforge`
    } else if (signal === 'WAIT') {
      document.title = 'Novaforge — Decision Desk'
    }
    prevSignalRef.current = signal
  }, [signal, symbol, liveLtp])

  const sessionAllowsLock =
    session.safeToTrade ||
    allowOffSessionLock ||
    phase === 'CHOP' ||
    phase === 'MOMENTUM'
  // Manual CALL/PUT: lock anytime with LIVE price. AUTO: needs confirmed signal.
  const canLock =
    isBridgeOnline &&
    liveLtp != null &&
    (lockMode !== 'AUTO' ? true : signal !== 'WAIT' && sessionAllowsLock)

  const pushScore = useCallback((row: ScorecardRecord) => {
    setScorecard((prev) => pruneWorkingDays([row, ...prev]).slice(0, 500))
    if (row.status === 'MISS') bumpWeight(row.failReason)
  }, [])

  // Resolve locks for all symbols
  useEffect(() => {
    const t = Date.now()
    setActiveLocks((prev) => {
      let changed = false
      const remaining: Record<string, ActiveLock> = {}
      Object.entries(prev).forEach(([key, lock]) => {
        const px = prices[lock.symbol]
        if (!px) {
          remaining[key] = lock
          return
        }
        const delta = lock.direction === 'CALL' ? px - lock.entryPrice : lock.entryPrice - px
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
            note = 'Target'
            pnlPoints = lock.targetPrice - lock.entryPrice
          } else if (px <= lock.stopPrice) {
            done = true
            status = 'MISS'
            reason = 'STOPPED'
            note = 'Stop'
            pnlPoints = lock.stopPrice - lock.entryPrice
          } else if (t >= lock.expiresAt) {
            done = true
            if (delta > 2) {
              status = 'HIT'
              reason = 'NONE'
              note = 'Time green'
            } else if (Math.abs(delta) <= 3) {
              status = 'FLAT'
              reason = 'CHOP'
              note = 'Time chop'
            } else {
              status = 'MISS'
              reason = 'TIME_WRONG_SIDE'
              note = 'Time reverse'
            }
          }
        } else {
          if (px <= lock.targetPrice) {
            done = true
            status = 'HIT'
            reason = 'NONE'
            note = 'Target'
            pnlPoints = lock.entryPrice - lock.targetPrice
          } else if (px >= lock.stopPrice) {
            done = true
            status = 'MISS'
            reason = 'STOPPED'
            note = 'Stop'
            pnlPoints = lock.entryPrice - lock.stopPrice
          } else if (t >= lock.expiresAt) {
            done = true
            if (delta > 2) {
              status = 'HIT'
              reason = 'NONE'
              note = 'Time green'
            } else if (Math.abs(delta) <= 3) {
              status = 'FLAT'
              reason = 'CHOP'
              note = 'Time chop'
            } else {
              status = 'MISS'
              reason = 'TIME_WRONG_SIDE'
              note = 'Time reverse'
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
            sessionPhase: phase,
          })
        } else {
          remaining[key] = lock
        }
      })
      return changed ? remaining : prev
    })
  }, [prices, now, pushScore])

  // 45m audit create + resolve / backfill
  useEffect(() => {
    if (!isBridgeOnline) return
    const t = Date.now()

    setAudits((prev) => {
      const still: AuditPending[] = []
      prev.forEach((a) => {
        const px = prices[a.symbol]
        if (t < a.expiresAt) {
          still.push(a)
          return
        }
        if (!px) {
          pushScore({
            id: `${a.id}_gap`,
            kind: 'AUDIT45',
            horizon: '45m',
            symbol: a.symbol,
            direction: a.signal,
            entryPrice: a.entryPrice,
            exitPrice: a.entryPrice,
            pnlPoints: 0,
            status: 'SKIP',
            failReason: 'DATA_GAP',
            note: 'Audit expired without LTP',
            lockedAt: a.lockedAt,
            resolvedAt: t,
            dayKey: a.dayKey,
          })
          return
        }
        let status: ScorecardRecord['status'] = 'FLAT'
        let reason: FailReason = 'CHOP'
        const delta = a.signal === 'CALL' ? px - a.entryPrice : a.entryPrice - px
        if (a.signal === 'WAIT') {
          status = 'SKIP'
          reason = 'NO_BREAKOUT'
        } else if (delta >= 8) {
          status = 'HIT'
          reason = 'NONE'
        } else if (delta <= -8) {
          status = 'MISS'
          reason = 'TIME_WRONG_SIDE'
        }
        pushScore({
          id: `${a.id}_done`,
          kind: 'AUDIT45',
          horizon: '45m',
          symbol: a.symbol,
          direction: a.signal,
          entryPrice: a.entryPrice,
          exitPrice: px,
          pnlPoints: a.signal === 'WAIT' ? 0 : delta,
          status,
          failReason: reason,
          note: '45m audit',
          lockedAt: a.lockedAt,
          resolvedAt: t,
          dayKey: a.dayKey,
        })
      })
      return still
    })

    if (liveLtp && (phase === 'MOMENTUM' || phase === 'CHOP')) {
      const pending = audits.find((a) => a.symbol === symbol && a.expiresAt > t)
      if (!pending) {
        setAudits((prev) => {
          if (prev.some((a) => a.symbol === symbol && a.expiresAt > t)) return prev
          return [
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
          ]
        })
      }
    }
  }, [liveLtp, isBridgeOnline, symbol, now, prices, phase, signal, pushScore, audits])

  const handleLock = (horizon: HorizonKey) => {
    if (!liveLtp || !isBridgeOnline) {
      setErr('Need LIVE price — bridge offline or stale.')
      return
    }
    const side = lockMode === 'AUTO' ? signal : lockMode
    if (side === 'WAIT') {
      setErr('AUTO mode is WAIT — pick CALL or PUT above to lock anytime, or wait for a break.')
      return
    }
    const rule = HORIZON_RULES[horizon]
    const stopExtra = weights.widenStop > 2 ? 1.15 : 1
    const td = rule.targetPts * mult
    const sd = rule.stopPts * mult * stopExtra
    const targetPrice = side === 'CALL' ? liveLtp + td : liveLtp - td
    const stopPrice = side === 'CALL' ? liveLtp - sd : liveLtp + sd
    setActiveLocks((prev) => ({
      ...prev,
      [`${symbol}_${horizon}`]: {
        id: `${symbol}_${horizon}_${Date.now()}`,
        horizon,
        symbol,
        entryPrice: liveLtp,
        targetPrice: Number(targetPrice.toFixed(2)),
        stopPrice: Number(stopPrice.toFixed(2)),
        direction: side as 'CALL' | 'PUT',
        lockedAt: Date.now(),
        expiresAt: Date.now() + rule.durationMs,
      },
    }))
    setErr(lockMode !== 'AUTO' && signal === 'WAIT' ? 'Locked on manual side (signal still WAIT).' : '')
  }

  const metrics = computeMetrics(scorecard)
  const pendingAudit = audits.find((a) => a.symbol === symbol && a.expiresAt > now)

  return (
    <div className="space-y-4">
      {/* Signal strip — text only, no avatar */}
      <div className={`${frame} p-4 flex flex-col sm:flex-row gap-3 items-center justify-between`}>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            KD desk · levels only
          </div>
          <p className="text-sm text-slate-700 mt-0.5">
            {signal === 'CALL' && 'Buffered break above ORB high · CALL bias'}
            {signal === 'PUT' && 'Buffered break below ORB low · PUT bias'}
            {signal === 'WAIT' && 'Inside range, unconfirmed, or blocked session · WAIT'}
          </p>
          <div className="text-[11px] text-slate-500 mt-1">{session.label}</div>
          <button
            type="button"
            className="mt-2 text-[11px] font-bold px-3 py-1 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
            onClick={() => {
              requestNotifyPermission()
              setNotifyOn(
                typeof window !== 'undefined' &&
                  'Notification' in window &&
                  Notification.permission === 'granted',
              )
            }}
          >
            {notifyOn ? 'Alerts on · browser notify + beep' : 'Enable trade alerts'}
          </button>
        </div>
        <div
          className={`px-5 py-3 rounded-xl border-2 font-black text-lg min-w-[110px] text-center ${
            signal === 'CALL'
              ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
              : signal === 'PUT'
                ? 'bg-rose-50 border-rose-400 text-rose-800'
                : 'bg-amber-50 border-amber-300 text-amber-800'
          }`}
        >
          {signal === 'CALL' ? (
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="w-5 h-5" /> CALL
            </span>
          ) : signal === 'PUT' ? (
            <span className="inline-flex items-center gap-1">
              <TrendingDown className="w-5 h-5" /> PUT
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Minus className="w-5 h-5" /> WAIT
            </span>
          )}
        </div>
      </div>

      {/* Header prices */}
      <div className={`${card} p-4 flex flex-wrap gap-3 items-center justify-between`}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['NIFTY', 'SENSEX', 'BANKNIFTY'] as SymbolKey[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSymbol(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  symbol === s ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">LTP</div>
            <div className="text-2xl font-black text-slate-900">
              {liveLtp != null ? liveLtp.toFixed(2) : '—'}
            </div>
          </div>
          <div
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
              isBridgeOnline
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            {isBridgeOnline ? `LIVE ${lastUpdated}` : 'OFFLINE'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void fetchSnapshot()}
          className="p-2 rounded-lg border border-slate-200 text-slate-600"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {err ? (
        <div className="flex items-center gap-2 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{err}</span>
        </div>
      ) : null}

      {/* ORB + gates */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`${card} p-3`}>
          <div className="text-[10px] font-bold text-emerald-700 uppercase">ORB high</div>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-emerald-200 bg-emerald-50/40 px-2 py-1.5 text-sm font-bold text-emerald-900"
            value={currentOrb.high}
            disabled={!session.orbEditable}
            onChange={(e) =>
              setOrbInputs((p) => ({ ...p, [symbol]: { ...p[symbol], high: e.target.value } }))
            }
            placeholder={session.orbEditable ? 'After 9:30' : 'Forming…'}
          />
        </div>
        <div className={`${card} p-3`}>
          <div className="text-[10px] font-bold text-rose-700 uppercase">ORB low</div>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-rose-200 bg-rose-50/40 px-2 py-1.5 text-sm font-bold text-rose-900"
            value={currentOrb.low}
            disabled={!session.orbEditable}
            onChange={(e) =>
              setOrbInputs((p) => ({ ...p, [symbol]: { ...p[symbol], low: e.target.value } }))
            }
            placeholder={session.orbEditable ? 'After 9:30' : 'Forming…'}
          />
        </div>
        <div className={`${card} p-3`}>
          <div className="text-[10px] font-bold text-slate-500 uppercase">Gates (±buffer)</div>
          <div className="mt-1 text-xs font-mono space-y-0.5">
            <div className="text-emerald-700">
              CALL &gt; {hasOrb ? (orbHigh + buffer).toFixed(1) : '—'}
            </div>
            <div className="text-rose-700">PUT &lt; {hasOrb ? (orbLow - buffer).toFixed(1) : '—'}</div>
          </div>
        </div>
        <div className={`${card} p-3`}>
          <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <Clock className="w-3 h-3" /> 45m audit
          </div>
          <div className="mt-1 text-xs font-bold text-slate-800">
            {pendingAudit
              ? `${pendingAudit.signal} · ${Math.max(0, Math.floor((pendingAudit.expiresAt - now) / 60000))}m left`
              : '—'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Score {metrics.hits}H / {metrics.misses}M · {metrics.hitRate}%
          </div>
        </div>
      </div>

      {!session.safeToTrade && phase !== 'CLOSED' ? (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex flex-wrap items-center gap-3">
          <span>{session.label} — new locks blocked by default.</span>
          <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={allowOffSessionLock}
              onChange={(e) => setAllowOffSessionLock(e.target.checked)}
            />
            Override (extra risk)
          </label>
        </div>
      ) : null}

      
      {/* Manual side — lock anytime when LIVE */}
      <div className={`${card} p-3 flex flex-wrap items-center gap-2`}>
        <span className="text-[10px] font-bold uppercase text-slate-500">Lock side</span>
        {(['AUTO', 'CALL', 'PUT'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setLockMode(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-black border ${
              lockMode === m
                ? m === 'CALL'
                  ? 'bg-emerald-600 text-white border-emerald-700'
                  : m === 'PUT'
                    ? 'bg-rose-600 text-white border-rose-700'
                    : 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {m}
          </button>
        ))}
        <span className="text-[11px] text-slate-500">
          {lockMode === 'AUTO'
            ? 'Follows confirmed break (WAIT blocks lock).'
            : `Manual ${lockMode} — LOCK enabled whenever LIVE.`}
        </span>
      </div>

      {/* Locks */}
      <div className={`${frame} overflow-hidden`}>
        <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-800">
          LOCK · 5 / 10 / 15 / 30 min · confirmed break only · 2 polls
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {(['5m', '10m', '15m', '30m'] as HorizonKey[]).map((hz) => {
            const rule = HORIZON_RULES[hz]
            const stopExtra = weights.widenStop > 2 ? 1.15 : 1
            const td = rule.targetPts * mult
            const sd = rule.stopPts * mult * stopExtra
            const lock = activeLocks[`${symbol}_${hz}`]
            const sideForCard = lockMode === 'AUTO' ? signal : lockMode
            const tgt =
              liveLtp && sideForCard !== 'WAIT'
                ? (sideForCard === 'CALL' ? liveLtp + td : liveLtp - td).toFixed(1)
                : '—'
            const stp =
              liveLtp && sideForCard !== 'WAIT'
                ? (sideForCard === 'CALL' ? liveLtp - sd : liveLtp + sd).toFixed(1)
                : '—'
            return (
              <div key={hz} className="p-4 space-y-2">
                <div className="flex justify-between text-xs font-black">
                  <span>{hz}</span>
                  <span
                    className={
                      (lockMode === 'AUTO' ? signal : lockMode) === 'CALL'
                        ? 'text-emerald-700'
                        : (lockMode === 'AUTO' ? signal : lockMode) === 'PUT'
                          ? 'text-rose-700'
                          : 'text-amber-700'
                    }
                  >
                    {lockMode === 'AUTO' ? signal : lockMode}
                  </span>
                </div>
                {lock ? (
                  <div className="text-[11px] rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                    <div className="font-bold text-emerald-700">ACTIVE {lock.direction}</div>
                    <div>Entry {lock.entryPrice.toFixed(1)}</div>
                    <div className="text-emerald-700">Tgt {lock.targetPrice}</div>
                    <div className="text-rose-700">Stop {lock.stopPrice}</div>
                    <div className="text-slate-500">
                      {Math.max(0, Math.floor((lock.expiresAt - now) / 1000))}s
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-[11px] rounded-xl border border-slate-100 bg-white p-2 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Target</span>
                        <span className="font-bold text-emerald-700">{tgt}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Stop</span>
                        <span className="font-bold text-rose-700">{stp}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!canLock}
                      onClick={() => handleLock(hz)}
                      className="w-full py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1 bg-slate-900 text-white disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      <Play className="w-3 h-3 fill-current" /> LOCK {hz}
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className={card + ' p-2'}>
        <RealTradingViewChart symbol={symbol} height={400} />
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
        <Search className="w-4 h-4 text-slate-500 mt-2.5 ml-1" />
        <input
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="NSE symbol"
        />
        <button type="submit" className="px-4 rounded-lg bg-slate-900 text-white text-xs font-bold">
          Load
        </button>
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
    <a
      className="text-slate-900 font-semibold underline"
      href="https://www.nseindia.com/reports/fii-dii"
      target="_blank"
      rel="noreferrer"
    >
      NSE FII / DII
    </a>
  </div>
)

export const VisualNewsWireDesk = () => (
  <div className={`${frame} p-5 space-y-3`}>
    <h2 className="font-bold text-slate-900">Event risk</h2>
    <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
      <li>Weekly expiry — wider stops / fewer locks after 13:30</li>
      <li>RBI / Budget / US CPI — prefer WAIT around release</li>
    </ul>
  </div>
)

export const SectorEtfMatrix = () => (
  <div className={`${card} p-6 text-sm text-slate-600`}>
    Liquid: NIFTYBEES · BANKBEES · ITBEES · GOLDBEES · SILVERBEES
  </div>
)

export const RiskProtocolDesk = () => (
  <div className={`${frame} p-6 text-sm text-slate-700 space-y-2`}>
    <div className="flex items-center gap-2 font-bold text-slate-900">
      <ShieldCheck className="w-5 h-5 text-emerald-600" /> Risk rules
    </div>
    <ul className="list-disc pl-5 space-y-1 text-xs">
      <li>Max 1 active lock per symbol × horizon.</li>
      <li>No new locks during ORB (9:15–9:30) or after 14:45 IST.</li>
      <li>Risk ≤ 1.5% of desk capital per idea.</li>
      <li>After 3 consecutive MISS — WAIT until next session window.</li>
    </ul>
  </div>
)

export default FoDecisionDesk
