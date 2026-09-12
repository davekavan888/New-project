import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  RefreshCw,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  AlertTriangle,
} from 'lucide-react'

const BRIDGE_URL = String(
  (import.meta as any).env?.VITE_ANGEL_BRIDGE_URL || '',
).replace(/\/$/, '')

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

interface HorizonConfig {
  durationMs: number
  targetPts: number
  stopPts: number
}

const HORIZON_RULES: Record<HorizonKey, HorizonConfig> = {
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

function istDayKey(ts = Date.now()): string {
  return new Date(ts).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function isWeekendIST(dayKey: string): boolean {
  const [y, m, d] = dayKey.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d, 6, 0, 0))
  const wd = new Date(utc.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getDay()
  return wd === 0 || wd === 6
}

/** Keep last 5 working days of records */
function pruneWorkingDays(list: ScorecardRecord[]): ScorecardRecord[] {
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

export const RealTradingViewChart: React.FC<{ symbol: string; height?: number }> = ({
  symbol,
  height = 420,
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
      theme: 'dark',
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
  return <div ref={ref} style={{ height }} className="w-full rounded-xl overflow-hidden" />
}

/** Learn simple weights from past MISS reasons */
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

export const HistoricalReportDesk: React.FC = () => {
  const [rows, setRows] = useState(() =>
    pruneWorkingDays(loadJSON<ScorecardRecord[]>(SCORE_KEY, [])),
  )
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
    <div className="space-y-6 font-mono text-[#f7f0dd]">
      <div>
        <h2 className="text-xl font-serif font-bold">Report card · 5 working days</h2>
        <p className="text-xs text-[#a8c0d0]">
          All LOCK + 45m audit rows. Opens of the site backfill pending windows. For true
          offline scoring, Railway bridge must stay online (see note in F&amp;O tab).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="bg-[#1e3a5f]/90 border border-[#c9a227]/40 p-3 rounded-xl">
          <div className="text-[#e8c547] font-bold mb-1">Self-tune counters</div>
          <div>Prefer WAIT in chop: {weights.preferWaitInChop}</div>
          <div>Stronger break preference: {weights.requireStrongerBreak}</div>
          <div>Widen stop preference: {weights.widenStop}</div>
        </div>
        <div className="bg-[#1e3a5f]/90 border border-[#c9a227]/40 p-3 rounded-xl md:col-span-2">
          <div className="text-[#e8c547] font-bold mb-1">MISS reasons (improve here)</div>
          {Object.keys(failCounts).length === 0 ? (
            <span className="text-[#8aa0b5]">No misses yet</span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(failCounts).map(([k, v]) => (
                <span key={k} className="px-2 py-1 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30">
                  {k}: {v}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {days.length === 0 ? (
        <p className="text-xs text-[#8aa0b5]">No saved days yet.</p>
      ) : (
        days.map((day) => {
          const list = byDay[day]
          const hits = list.filter((r) => r.status === 'HIT').length
          const miss = list.filter((r) => r.status === 'MISS').length
          const flat = list.filter((r) => r.status === 'FLAT' || r.status === 'SKIP').length
          return (
            <div key={day} className="bg-[#1e3a5f]/90 border border-[#c9a227]/40 rounded-xl overflow-hidden">
              <div className="p-3 bg-[#2a4a6e] border-b border-[#c9a227]/30 flex flex-wrap gap-3 text-xs font-bold">
                <span className="text-[#e8c547]">{day}</span>
                <span className="text-emerald-400">HIT {hits}</span>
                <span className="text-rose-400">MISS {miss}</span>
                <span className="text-[#a8c0d0]">FLAT/SKIP {flat}</span>
                <span>N={list.length}</span>
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="text-[#a8c0d0] sticky top-0 bg-[#152a45]/90">
                    <tr>
                      <th className="p-2">Time</th>
                      <th className="p-2">Kind</th>
                      <th className="p-2">H</th>
                      <th className="p-2">Side</th>
                      <th className="p-2">Entry</th>
                      <th className="p-2">Exit</th>
                      <th className="p-2">Result</th>
                      <th className="p-2">Why fail / note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c9a227]/20">
                    {list.map((r) => (
                      <tr key={r.id}>
                        <td className="p-2 text-[#a8c0d0]">
                          {new Date(r.resolvedAt).toLocaleTimeString('en-IN', {
                            hour12: false,
                            timeZone: 'Asia/Kolkata',
                          })}
                        </td>
                        <td className="p-2">{r.kind}</td>
                        <td className="p-2 text-[#e8c547]">{r.horizon}</td>
                        <td className="p-2 font-bold">{r.direction}</td>
                        <td className="p-2">{r.entryPrice.toFixed(1)}</td>
                        <td className="p-2">{r.exitPrice.toFixed(1)}</td>
                        <td
                          className={`p-2 font-bold ${
                            r.status === 'HIT'
                              ? 'text-emerald-400'
                              : r.status === 'MISS'
                                ? 'text-rose-400'
                                : 'text-amber-300'
                          }`}
                        >
                          {r.status}
                        </td>
                        <td className="p-2 text-[#c5d5e0]">
                          {r.status === 'MISS' ? r.failReason : r.note || '—'}
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
  const [liveLtp, setLiveLtp] = useState<number | null>(null)
  const [orbHighInput, setOrbHighInput] = useState('')
  const [orbLowInput, setOrbLowInput] = useState('')
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
    const pruned = pruneWorkingDays(scorecard)
    localStorage.setItem(SCORE_KEY, JSON.stringify(pruned.slice(0, 500)))
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
      setErr('Set VITE_ANGEL_BRIDGE_URL')
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
        setLastUpdated(
          new Date().toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' }),
        )
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
  const breakPad =
    (symbol === 'BANKNIFTY' ? 15 : 6) + weights.requireStrongerBreak * 2

  const deriveSignal = (): SignalType => {
    if (!liveLtp || !hasOrb) return 'WAIT'
    if (weights.preferWaitInChop > 3 && liveLtp < orbHigh + breakPad && liveLtp > orbLow - breakPad) {
      // after repeated chop misses, demand clearer break
    }
    if (liveLtp > orbHigh + (weights.requireStrongerBreak > 2 ? breakPad * 0.3 : 0)) return 'CALL'
    if (liveLtp < orbLow - (weights.requireStrongerBreak > 2 ? breakPad * 0.3 : 0)) return 'PUT'
    return 'WAIT'
  }
  const signal = deriveSignal()

  const pushScore = (row: ScorecardRecord) => {
    setScorecard((prev) => pruneWorkingDays([row, ...prev]).slice(0, 500))
    if (row.status === 'MISS') bumpWeight(row.failReason)
  }

  // Resolve locks
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
            note = 'Target hit'
          } else if (liveLtp <= lock.stopPrice) {
            done = true
            status = 'MISS'
            reason = 'STOPPED'
            note = 'Hit stop'
          } else if (t >= lock.expiresAt) {
            done = true
            if (liveLtp > lock.entryPrice + 2) {
              status = 'HIT'
              reason = 'NONE'
              note = 'Time up, green'
            } else if (Math.abs(liveLtp - lock.entryPrice) < 3) {
              status = 'FLAT'
              reason = 'CHOP'
              note = 'Time up, flat'
            } else {
              status = 'MISS'
              reason = 'TIME_WRONG_SIDE'
              note = 'Time up, wrong side'
            }
          }
        } else {
          if (liveLtp <= lock.targetPrice) {
            done = true
            status = 'HIT'
            reason = 'NONE'
            note = 'Target hit'
          } else if (liveLtp >= lock.stopPrice) {
            done = true
            status = 'MISS'
            reason = 'STOPPED'
            note = 'Hit stop'
          } else if (t >= lock.expiresAt) {
            done = true
            if (liveLtp < lock.entryPrice - 2) {
              status = 'HIT'
              reason = 'NONE'
              note = 'Time up, green'
            } else if (Math.abs(liveLtp - lock.entryPrice) < 3) {
              status = 'FLAT'
              reason = 'CHOP'
              note = 'Time up, flat'
            } else {
              status = 'MISS'
              reason = 'TIME_WRONG_SIDE'
              note = 'Time up, wrong side'
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

  // 45-minute auto audit: create + resolve
  useEffect(() => {
    if (!liveLtp || !isBridgeOnline) return
    const t = Date.now()
    // resolve expired audits
    const still: AuditPending[] = []
    audits.forEach((a) => {
      if (t < a.expiresAt) {
        still.push(a)
        return
      }
      let status: ScorecardRecord['status'] = 'FLAT'
      let reason: FailReason = 'CHOP'
      let note = '45m window closed'
      if (a.signal === 'WAIT') {
        status = 'SKIP'
        reason = 'NO_BREAKOUT'
        note = 'WAIT — no ORB break at open of window'
      } else if (a.signal === 'CALL') {
        if (liveLtp > a.entryPrice + 8) {
          status = 'HIT'
          reason = 'NONE'
          note = 'Up after CALL audit'
        } else if (liveLtp < a.entryPrice - 8) {
          status = 'MISS'
          reason = 'TIME_WRONG_SIDE'
          note = 'Down after CALL audit'
        } else {
          status = 'FLAT'
          reason = 'CHOP'
          note = 'Mostly flat after CALL'
        }
      } else if (a.signal === 'PUT') {
        if (liveLtp < a.entryPrice - 8) {
          status = 'HIT'
          reason = 'NONE'
          note = 'Down after PUT audit'
        } else if (liveLtp > a.entryPrice + 8) {
          status = 'MISS'
          reason = 'TIME_WRONG_SIDE'
          note = 'Up after PUT audit'
        } else {
          status = 'FLAT'
          reason = 'CHOP'
          note = 'Mostly flat after PUT'
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

    // open new 45m audit at most once per window
    if (t - lastAuditAt >= AUDIT_MS || lastAuditAt === 0) {
      // only auto-open during rough market hours IST 9:15-15:30
      const ist = new Date().toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
      })
      const [hh, mm] = ist.split(':').map(Number)
      const mins = hh * 60 + mm
      if (mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30) {
        if (lastAuditAt === 0 || t - lastAuditAt >= AUDIT_MS) {
          const id = `audit_${symbol}_${t}`
          setAudits((prev) => [
            ...prev.filter((x) => x.expiresAt > t),
            {
              id,
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveLtp, now, isBridgeOnline])

  const handleLockHorizon = (horizon: HorizonKey) => {
    if (!liveLtp || !isBridgeOnline) {
      setErr('Need LIVE LTP')
      return
    }
    if (signal === 'WAIT') {
      setErr('WAIT — no CALL/PUT until ORB break')
      return
    }
    const rule = HORIZON_RULES[horizon]
    const mult = symbol === 'BANKNIFTY' ? 2.5 : 1
    const stopExtra = weights.widenStop > 2 ? 1.15 : 1
    const targetDistance = rule.targetPts * mult
    const stopDistance = rule.stopPts * mult * stopExtra
    const targetPrice =
      signal === 'CALL' ? liveLtp + targetDistance : liveLtp - targetDistance
    const stopPrice =
      signal === 'CALL' ? liveLtp - stopDistance : liveLtp + stopDistance
    const lockKey = `${symbol}_${horizon}`
    setActiveLocks((prev) => ({
      ...prev,
      [lockKey]: {
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
    <div className="space-y-6 font-mono text-[#f7f0dd]">
      {/* Palace advisor */}
      <div className="rounded-2xl border-2 border-[#c9a227]/50 bg-gradient-to-r from-[#2c5282] via-[#2a4a6e] to-[#1b4332] p-4 flex flex-col sm:flex-row gap-4 items-center shadow-xl">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-[#f0d77b] to-[#c9a227] flex items-center justify-center text-4xl shadow-lg border-2 border-[#f7f0dd]/40 shrink-0">
          🧙‍♂️
        </div>
        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="text-[#e8c547] text-[10px] tracking-[0.2em] uppercase font-bold">Court Advisor · KD&apos;s Agent</div>
          <div className="text-lg font-serif font-bold text-[#f7f0dd]">Guidance from the trading court</div>
          <p className="text-xs text-[#c5d5e0] leading-relaxed">
            Clear levels only. Prefer WAIT when the range is unclear. Journal every lock — the report card is your real teacher.
          </p>
        </div>
        <div className="text-center px-4 py-2 rounded-xl bg-black/20 border border-[#c9a227]/30">
          <div className="text-[10px] text-[#a8c0d0]">Posture</div>
          <div className="text-xl font-black text-[#f0d77b]">LIVE DESK</div>
        </div>
      </div>
      <div className="bg-[#c9a227]/15 border border-[#c9a227]/40 rounded-xl p-3 text-[11px] text-[#f0e6c0]">
        <strong>Auto system:</strong> 45m audits run while this tab is open (or when you reopen —
        pending windows resolve on next live price). For scoring while phone is fully closed,
        Railway bridge must keep polling (backend). Frontend alone cannot score offline.
      </div>

      <div className="bg-[#1e3a5f]/90 border border-[#c9a227]/40 p-4 rounded-xl flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-[#152a45]/90 p-1 rounded-lg border border-[#c9a227]/40">
            {(['NIFTY', 'BANKNIFTY'] as SymbolKey[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSymbol(s)}
                className={`px-4 py-1.5 rounded text-xs font-bold ${
                  symbol === s ? 'bg-[#e8c547] text-[#1a2a1a]' : 'text-[#a8c0d0]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <span className="text-base font-bold">
            {liveLtp != null ? liveLtp.toFixed(2) : 'OFFLINE'}
          </span>
          <span
            className={`text-sm font-black px-3 py-1 rounded-lg border ${
              signal === 'CALL'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : signal === 'PUT'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
          >
            {signal === 'CALL' ? '→ CALL' : signal === 'PUT' ? '→ PUT' : '→ WAIT'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={isBridgeOnline ? 'text-emerald-400' : 'text-rose-400'}>
            {isBridgeOnline ? `LIVE ${lastUpdated}` : 'BRIDGE OFF'}
          </span>
          {err ? <span className="text-amber-300 max-w-[180px] truncate">{err}</span> : null}
          <button type="button" onClick={() => void fetchSnapshot()} className="p-1.5 border border-[#c9a227]/40 rounded text-[#e8c547]">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-[#1e3a5f]/90 border border-[#c9a227]/30 p-3 rounded-xl">
          <div className="text-[10px] text-[#a8c0d0]">ORB HIGH</div>
          <input
            className="w-full mt-1 bg-[#152a45]/90 border border-emerald-500/30 rounded px-2 py-1 text-emerald-400 font-bold"
            value={orbHighInput}
            onChange={(e) => setOrbHighInput(e.target.value)}
            placeholder="after 9:30"
          />
        </div>
        <div className="bg-[#1e3a5f]/90 border border-[#c9a227]/30 p-3 rounded-xl">
          <div className="text-[10px] text-[#a8c0d0]">ORB LOW</div>
          <input
            className="w-full mt-1 bg-[#152a45]/90 border border-rose-500/30 rounded px-2 py-1 text-rose-400 font-bold"
            value={orbLowInput}
            onChange={(e) => setOrbLowInput(e.target.value)}
            placeholder="after 9:30"
          />
        </div>
        <div className="bg-[#1e3a5f]/90 border border-[#c9a227]/30 p-3 rounded-xl">
          <div className="text-[10px] text-[#a8c0d0]">45m AUDIT</div>
          <div className="text-sm font-bold mt-1">
            {pendingAudit
              ? `${pendingAudit.signal} · ${Math.max(0, Math.floor((pendingAudit.expiresAt - now) / 60000))}m left`
              : 'Will open next window'}
          </div>
        </div>
        <div className="bg-[#1e3a5f]/90 border border-[#c9a227]/30 p-3 rounded-xl">
          <div className="text-[10px] text-[#a8c0d0]">TODAY SCORE (saved)</div>
          <div className="text-sm font-bold mt-1 text-emerald-400">
            {hits}H / {misses}M
          </div>
        </div>
      </div>

      <div className="bg-[#1e3a5f]/90 border border-[#c9a227]/40 p-2 rounded-xl">
        <RealTradingViewChart symbol={symbol} height={400} />
      </div>

      <div className="bg-[#1e3a5f]/90 border border-[#c9a227]/40 rounded-xl overflow-hidden">
        <div className="p-3 bg-[#2a4a6e] border-b border-[#c9a227]/30 text-xs font-bold text-[#e8c547] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          NEXT 5 / 10 / 15 / 30 MIN — clear CALL or PUT only after ORB break (else WAIT)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#c9a227]/25">
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
            return (
              <div key={hz} className="p-4 space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>{hz.toUpperCase()}</span>
                  <span
                    className={
                      signal === 'CALL'
                        ? 'text-emerald-400'
                        : signal === 'PUT'
                          ? 'text-rose-400'
                          : 'text-amber-300'
                    }
                  >
                    {signal}
                  </span>
                </div>
                {lock ? (
                  <div className="text-[11px] space-y-1 bg-[#152a45]/90 p-2 rounded border border-[#c9a227]/40">
                    <div>LOCKED {lock.direction}</div>
                    <div className="text-emerald-400">T {lock.targetPrice}</div>
                    <div className="text-rose-400">S {lock.stopPrice}</div>
                    <div className="text-[#8aa0b5]">
                      {Math.max(0, Math.floor((lock.expiresAt - now) / 1000))}s
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-[11px] bg-[#152a45]/90 p-2 rounded border border-[#c9a227]/20">
                      <div className="flex justify-between">
                        <span className="text-[#a8c0d0]">Target</span>
                        <span className="text-emerald-400">{tgt}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#a8c0d0]">Stop</span>
                        <span className="text-rose-400">{stp}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!isBridgeOnline || !liveLtp || signal === 'WAIT'}
                      onClick={() => handleLockHorizon(hz)}
                      className="w-full py-2 rounded text-xs font-bold bg-[#e8c547] text-[#1a2a1a] disabled:bg-[#1E293B] disabled:text-[#8aa0b5] flex items-center justify-center gap-1"
                    >
                      <Play className="w-3 h-3" /> Lock {hz}
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export const UniversalStockScreener: React.FC = () => {
  const [sym, setSym] = useState('RELIANCE')
  const [input, setInput] = useState('')
  return (
    <div className="space-y-4 font-mono">
      <form
        className="relative max-w-md"
        onSubmit={(e) => {
          e.preventDefault()
          const c = input.trim().toUpperCase().replace(/\.NS$/i, '')
          if (c) {
            setSym(c)
            setInput('')
          }
        }}
      >
        <Search className="w-4 h-4 absolute left-3 top-3 text-[#e8c547]" />
        <input
          className="w-full bg-[#1e3a5f]/90 border border-[#D4AF37]/40 rounded-xl pl-9 pr-4 py-2.5 text-xs"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="NSE symbol"
        />
      </form>
      <RealTradingViewChart symbol={`NSE:${sym}`} height={480} />
    </div>
  )
}

export const InstitutionalFlowsDesk = () => (
  <div className="p-6 text-xs text-[#a8c0d0]">
    Treasury note — Official EOD:{' '}
    <a className="text-[#e8c547] underline" href="https://www.nseindia.com/reports/fii-dii" target="_blank" rel="noreferrer">
      NSE FII/DII
    </a>
  </div>
)
export const VisualNewsWireDesk = () => (
  <div className="space-y-4 font-mono text-[#f7f0dd]">
    <h2 className="text-xl font-serif font-bold text-[#e8c547]">Court Calendar · Event Risk</h2>
    <p className="text-xs text-[#a8c0d0]">Use this instead of noisy news feeds. Mark high-impact days before you size up.</p>
    <div className="grid gap-3 md:grid-cols-2">
      {[
        ['Weekly', 'Nifty / BankNifty expiry — expect wider swings near close'],
        ['Monthly', 'F&O expiry week — prefer smaller size'],
        ['Macro', 'RBI policy / CPI / Budget — prefer WAIT into print'],
        ['Global', 'US Fed week / major US data — watch Gift Nifty gap'],
      ].map(([t, d]) => (
        <div key={t} className="rounded-2xl border border-[#c9a227]/40 bg-[#1e3a5f]/90 p-4">
          <div className="text-[#e8c547] text-xs font-bold uppercase tracking-wider">{t}</div>
          <p className="text-sm text-[#c5d5e0] mt-1">{d}</p>
        </div>
      ))}
    </div>
  </div>
)
export const SectorEtfMatrix = () => (
  <div className="p-6 text-xs text-[#a8c0d0]">Use screener for SILVERBEES / GOLDBEES / ITBEES</div>
)
export const RiskProtocolDesk = () => (
  <div className="p-6 text-xs text-[#a8c0d0] space-y-2">
    <p>1.5% risk max · no lock on WAIT · read MISS reasons on Report Card</p>
  </div>
)

export default FoDecisionDesk
