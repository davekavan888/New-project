import React, { useState, useEffect, useRef, useCallback } from 'react'
import { RefreshCw, Play, CheckCircle, XCircle, Clock, Search } from 'lucide-react'

const BRIDGE_URL = String(
  (import.meta as any).env?.VITE_ANGEL_BRIDGE_URL || '',
).replace(/\/$/, '')

type HorizonKey = '5m' | '10m' | '15m' | '30m'
type SignalType = 'CALL' | 'PUT' | 'WAIT'
type SymbolKey = 'NIFTY' | 'BANKNIFTY'

interface HorizonConfig {
  durationMs: number
  targetPts: number
  stopPts: number
}

/** Independent distances — 5m ≠ 10m ≠ 15m ≠ 30m */
const HORIZON_RULES: Record<HorizonKey, HorizonConfig> = {
  '5m': { durationMs: 5 * 60 * 1000, targetPts: 18, stopPts: 12 },
  '10m': { durationMs: 10 * 60 * 1000, targetPts: 30, stopPts: 20 },
  '15m': { durationMs: 15 * 60 * 1000, targetPts: 45, stopPts: 28 },
  '30m': { durationMs: 30 * 60 * 1000, targetPts: 70, stopPts: 40 },
}

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
  horizon: HorizonKey
  symbol: SymbolKey
  direction: 'CALL' | 'PUT'
  entryPrice: number
  exitPrice: number
  targetPrice: number
  stopPrice: number
  status: 'HIT' | 'MISS'
  lockedAt: number
  resolvedAt: number
}

const LOCKS_KEY = 'novaforge_active_locks_v2'
const SCORE_KEY = 'novaforge_scorecard_v2'
const ORB_KEY = 'novaforge_manual_orb_v2'

export const RealTradingViewChart: React.FC<{ symbol: string; height?: number }> = ({
  symbol,
  height = 460,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.innerHTML = ''
    const widgetContainer = document.createElement('div')
    widgetContainer.className = 'tradingview-widget-container__widget'
    widgetContainer.style.height = `${height}px`
    widgetContainer.style.width = '100%'
    el.appendChild(widgetContainer)
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    const tvSymbol =
      symbol === 'BANKNIFTY' || symbol === 'NSE:BANKNIFTY'
        ? 'NSE:BANKNIFTY'
        : symbol.includes(':')
          ? symbol
          : `NSE:${symbol}`
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: '5',
      timezone: 'Asia/Kolkata',
      theme: 'dark',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      hide_top_toolbar: false,
      support_host: 'https://www.tradingview.com',
    })
    el.appendChild(script)
    return () => {
      el.innerHTML = ''
    }
  }, [symbol, height])
  return (
    <div
      className="tradingview-widget-container w-full"
      ref={containerRef}
      style={{ height: `${height}px` }}
    />
  )
}

function loadLocks(): Record<string, ActiveLock> {
  try {
    const s = localStorage.getItem(LOCKS_KEY)
    return s ? JSON.parse(s) : {}
  } catch {
    return {}
  }
}

function loadScore(): ScorecardRecord[] {
  try {
    const s = localStorage.getItem(SCORE_KEY)
    return s ? JSON.parse(s) : []
  } catch {
    return []
  }
}

export const HistoricalReportDesk: React.FC = () => {
  const [scorecard, setScorecard] = useState<ScorecardRecord[]>(() => loadScore())
  useEffect(() => {
    const id = setInterval(() => setScorecard(loadScore()), 2000)
    return () => clearInterval(id)
  }, [])
  const hits = scorecard.filter((s) => s.status === 'HIT').length
  const misses = scorecard.filter((s) => s.status === 'MISS').length
  const rate = scorecard.length ? ((hits / scorecard.length) * 100).toFixed(1) : '—'
  return (
    <div className="space-y-4 font-mono text-[#F8FAFC]">
      <h2 className="text-xl font-serif font-bold">Resolved scorecard (all saved)</h2>
      <div className="flex gap-4 text-xs">
        <span>Total: {scorecard.length}</span>
        <span className="text-emerald-400">HIT: {hits}</span>
        <span className="text-rose-400">MISS: {misses}</span>
        <span className="text-[#D4AF37]">Win rate: {rate}%</span>
      </div>
      {scorecard.length === 0 ? (
        <p className="text-xs text-[#64748B]">No resolved locks yet.</p>
      ) : (
        <div className="overflow-x-auto bg-[#0D182E] border border-[#D4AF37]/30 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070E1C] text-[#94A3B8]">
              <tr>
                <th className="p-3">Resolved</th>
                <th className="p-3">Index</th>
                <th className="p-3">H</th>
                <th className="p-3">Side</th>
                <th className="p-3">Entry</th>
                <th className="p-3">Exit</th>
                <th className="p-3">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4AF37]/10">
              {scorecard.map((item) => (
                <tr key={item.id}>
                  <td className="p-3 text-[#94A3B8]">
                    {new Date(item.resolvedAt).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      hour12: false,
                    })}
                  </td>
                  <td className="p-3 font-bold">{item.symbol}</td>
                  <td className="p-3 text-[#D4AF37]">{item.horizon}</td>
                  <td className="p-3">{item.direction}</td>
                  <td className="p-3">{item.entryPrice.toFixed(2)}</td>
                  <td className="p-3">{item.exitPrice.toFixed(2)}</td>
                  <td
                    className={`p-3 font-bold ${
                      item.status === 'HIT' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {item.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export const FoDecisionDesk: React.FC = () => {
  const [symbol, setSymbol] = useState<SymbolKey>('NIFTY')
  const [liveLtp, setLiveLtp] = useState<number | null>(null)
  const [orbHighInput, setOrbHighInput] = useState('')
  const [orbLowInput, setOrbLowInput] = useState('')
  const [lastUpdated, setLastUpdated] = useState('--:--:--')
  const [isBridgeOnline, setIsBridgeOnline] = useState(false)
  const [err, setErr] = useState('')
  const [now, setNow] = useState(Date.now())
  const [activeLocks, setActiveLocks] = useState<Record<string, ActiveLock>>(() => loadLocks())
  const [scorecard, setScorecard] = useState<ScorecardRecord[]>(() => loadScore())
  const evaluating = useRef(false)

  useEffect(() => {
    try {
      const s = localStorage.getItem(ORB_KEY)
      if (s) {
        const o = JSON.parse(s)
        if (o.high) setOrbHighInput(String(o.high))
        if (o.low) setOrbLowInput(String(o.low))
      }
    } catch {
      /* */
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        ORB_KEY,
        JSON.stringify({ high: orbHighInput, low: orbLowInput }),
      )
    } catch {
      /* */
    }
  }, [orbHighInput, orbLowInput])

  useEffect(() => {
    localStorage.setItem(LOCKS_KEY, JSON.stringify(activeLocks))
  }, [activeLocks])

  useEffect(() => {
    localStorage.setItem(SCORE_KEY, JSON.stringify(scorecard.slice(0, 300)))
  }, [scorecard])

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
      let extractedLtp: number | null = null
      if (data.ltp && typeof data.ltp === 'object') {
        extractedLtp = Number(symbol === 'NIFTY' ? data.ltp.NIFTY : data.ltp.BANKNIFTY)
      } else if (symbol === 'NIFTY' && data.nifty?.ltp) {
        extractedLtp = Number(data.nifty.ltp)
      } else if (symbol === 'BANKNIFTY' && data.bankNifty?.ltp) {
        extractedLtp = Number(data.bankNifty.ltp)
      }
      if (extractedLtp && !Number.isNaN(extractedLtp) && extractedLtp > 0) {
        setLiveLtp(extractedLtp)
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
    const timer = setInterval(() => void fetchSnapshot(), 2000)
    return () => clearInterval(timer)
  }, [fetchSnapshot])

  const orbHigh = parseFloat(orbHighInput)
  const orbLow = parseFloat(orbLowInput)
  const hasOrb = !Number.isNaN(orbHigh) && !Number.isNaN(orbLow) && orbHigh > orbLow

  /** CALL only above ORB high; PUT only below ORB low; else WAIT */
  const deriveSignal = (): SignalType => {
    if (!liveLtp || !hasOrb) return 'WAIT'
    if (liveLtp > orbHigh) return 'CALL'
    if (liveLtp < orbLow) return 'PUT'
    return 'WAIT'
  }
  const signal = deriveSignal()

  // Resolve locks without depending on activeLocks in effect deps (avoid loops)
  useEffect(() => {
    if (!liveLtp || evaluating.current) return
    evaluating.current = true
    try {
      const locks = loadLocks()
      const remaining: Record<string, ActiveLock> = {}
      const newRecords: ScorecardRecord[] = []
      const t = Date.now()
      Object.entries(locks).forEach(([lockKey, lock]) => {
        let isResolved = false
        let finalStatus: 'HIT' | 'MISS' = 'MISS'
        if (lock.direction === 'CALL') {
          if (liveLtp >= lock.targetPrice) {
            isResolved = true
            finalStatus = 'HIT'
          } else if (liveLtp <= lock.stopPrice) {
            isResolved = true
            finalStatus = 'MISS'
          } else if (t >= lock.expiresAt) {
            isResolved = true
            finalStatus = liveLtp > lock.entryPrice ? 'HIT' : 'MISS'
          }
        } else {
          if (liveLtp <= lock.targetPrice) {
            isResolved = true
            finalStatus = 'HIT'
          } else if (liveLtp >= lock.stopPrice) {
            isResolved = true
            finalStatus = 'MISS'
          } else if (t >= lock.expiresAt) {
            isResolved = true
            finalStatus = liveLtp < lock.entryPrice ? 'HIT' : 'MISS'
          }
        }
        if (isResolved) {
          newRecords.push({
            id: `${lockKey}_${t}`,
            horizon: lock.horizon,
            symbol: lock.symbol,
            direction: lock.direction,
            entryPrice: lock.entryPrice,
            exitPrice: liveLtp,
            targetPrice: lock.targetPrice,
            stopPrice: lock.stopPrice,
            status: finalStatus,
            lockedAt: lock.lockedAt,
            resolvedAt: t,
          })
        } else {
          remaining[lockKey] = lock
        }
      })
      if (newRecords.length > 0) {
        setScorecard((prev) => [...newRecords, ...prev].slice(0, 300))
        setActiveLocks(remaining)
      }
    } finally {
      evaluating.current = false
    }
  }, [liveLtp, now])

  const handleLockHorizon = (horizon: HorizonKey) => {
    if (!liveLtp || !isBridgeOnline) {
      setErr('Need LIVE LTP to lock')
      return
    }
    if (signal === 'WAIT') {
      setErr('Signal is WAIT — set ORB and wait for break, or no lock')
      return
    }
    const rule = HORIZON_RULES[horizon]
    const multiplier = symbol === 'BANKNIFTY' ? 2.5 : 1.0
    const targetDistance = rule.targetPts * multiplier
    const stopDistance = rule.stopPts * multiplier
    const targetPrice =
      signal === 'CALL' ? liveLtp + targetDistance : liveLtp - targetDistance
    const stopPrice =
      signal === 'CALL' ? liveLtp - stopDistance : liveLtp + stopDistance
    const lockKey = `${symbol}_${horizon}`
    const newLock: ActiveLock = {
      horizon,
      symbol,
      entryPrice: liveLtp,
      targetPrice: Number(targetPrice.toFixed(2)),
      stopPrice: Number(stopPrice.toFixed(2)),
      direction: signal,
      lockedAt: Date.now(),
      expiresAt: Date.now() + rule.durationMs,
    }
    setActiveLocks((prev) => ({ ...prev, [lockKey]: newLock }))
    setErr('')
  }

  const totalLockedTrades = scorecard.length
  const hits = scorecard.filter((s) => s.status === 'HIT').length
  const misses = scorecard.filter((s) => s.status === 'MISS').length
  const winRate =
    totalLockedTrades > 0 ? ((hits / totalLockedTrades) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-6 font-mono text-[#F8FAFC]">
      <div className="bg-[#0D182E] border border-[#D4AF37]/30 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-[#070E1C] p-1 rounded-lg border border-[#D4AF37]/30">
            {(['NIFTY', 'BANKNIFTY'] as SymbolKey[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSymbol(s)}
                className={`px-4 py-1.5 rounded text-xs font-bold ${
                  symbol === s ? 'bg-[#D4AF37] text-[#070E1C]' : 'text-[#94A3B8]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="text-xs">
            <span className="text-[#94A3B8]">LTP: </span>
            <span className="text-base font-bold text-white">
              {liveLtp != null ? liveLtp.toFixed(2) : 'OFFLINE'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isBridgeOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            {isBridgeOnline ? `LIVE (${lastUpdated})` : 'BRIDGE OFF'}
          </span>
          {err ? <span className="text-amber-300 max-w-[200px] truncate">{err}</span> : null}
          <button
            type="button"
            onClick={() => void fetchSnapshot()}
            className="p-1.5 bg-[#070E1C] border border-[#D4AF37]/30 rounded text-[#D4AF37]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] block uppercase">Posture</span>
          <span
            className={`text-xl font-bold block mt-1 ${
              signal === 'CALL'
                ? 'text-emerald-400'
                : signal === 'PUT'
                  ? 'text-rose-400'
                  : 'text-amber-400'
            }`}
          >
            {signal === 'CALL' ? 'CALL' : signal === 'PUT' ? 'PUT' : 'WAIT'}
          </span>
          <span className="text-[10px] text-[#64748B]">
            {hasOrb ? 'ORB break rule' : 'Enter ORB high/low first'}
          </span>
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] block uppercase">ORB High (manual)</span>
          <input
            className="mt-1 w-full bg-[#070E1C] border border-emerald-500/30 rounded px-2 py-1 text-emerald-400 font-bold text-sm"
            value={orbHighInput}
            onChange={(e) => setOrbHighInput(e.target.value)}
            placeholder="after 9:30"
          />
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] block uppercase">ORB Low (manual)</span>
          <input
            className="mt-1 w-full bg-[#070E1C] border border-rose-500/30 rounded px-2 py-1 text-rose-400 font-bold text-sm"
            value={orbLowInput}
            onChange={(e) => setOrbLowInput(e.target.value)}
            placeholder="after 9:30"
          />
        </div>
        <div className="bg-[#0D182E] border border-[#D4AF37]/20 p-4 rounded-xl">
          <span className="text-[10px] text-[#94A3B8] block uppercase">Scorecard</span>
          <span className="text-lg font-bold text-white block mt-1">
            {hits}H / {misses}M
          </span>
          <span className="text-[10px] text-[#D4AF37]">{winRate}% of resolved</span>
        </div>
      </div>

      <div className="bg-[#0D182E] border border-[#D4AF37]/30 p-3 rounded-xl">
        <RealTradingViewChart symbol={symbol} height={460} />
      </div>

      <div className="bg-[#0D182E] border border-[#D4AF37]/30 rounded-xl overflow-hidden">
        <div className="p-3 bg-[#111F38] border-b border-[#D4AF37]/20 flex justify-between items-center text-xs">
          <span className="font-bold text-[#D4AF37]">HORIZON LOCKS (different T/S each)</span>
          <span className="text-[#94A3B8]">Lock only when CALL or PUT (ORB break)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#D4AF37]/15">
          {(['5m', '10m', '15m', '30m'] as HorizonKey[]).map((hz) => {
            const lockKey = `${symbol}_${hz}`
            const active = activeLocks[lockKey]
            const rule = HORIZON_RULES[hz]
            const multiplier = symbol === 'BANKNIFTY' ? 2.5 : 1.0
            const targetDist = rule.targetPts * multiplier
            const stopDist = rule.stopPts * multiplier
            const projTarget =
              liveLtp && signal !== 'WAIT'
                ? signal === 'CALL'
                  ? (liveLtp + targetDist).toFixed(1)
                  : (liveLtp - targetDist).toFixed(1)
                : '--'
            const projStop =
              liveLtp && signal !== 'WAIT'
                ? signal === 'CALL'
                  ? (liveLtp - stopDist).toFixed(1)
                  : (liveLtp + stopDist).toFixed(1)
                : '--'
            const secsLeft = active
              ? Math.max(0, Math.floor((active.expiresAt - now) / 1000))
              : 0
            return (
              <div key={hz} className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-white uppercase">{hz}</span>
                  <span className="text-[10px] text-[#94A3B8]">
                    T±{targetDist} S±{stopDist}
                  </span>
                </div>
                {active ? (
                  <div className="bg-[#070E1C] p-3 rounded border border-[#D4AF37]/40 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8]">State</span>
                      <span className="text-emerald-400 font-bold">LOCKED</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8]">Side</span>
                      <span className="font-bold">{active.direction}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8]">Entry</span>
                      <span>{active.entryPrice.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8]">Target</span>
                      <span className="text-emerald-400">{active.targetPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8]">Stop</span>
                      <span className="text-rose-400">{active.stopPrice}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[#D4AF37]/10 text-[10px] text-[#64748B]">
                      <span>Expires</span>
                      <span>{secsLeft}s</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="bg-[#070E1C] p-2.5 rounded border border-[#D4AF37]/10 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#94A3B8]">Target</span>
                        <span className="text-emerald-400">{projTarget}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#94A3B8]">Stop</span>
                        <span className="text-rose-400">{projStop}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLockHorizon(hz)}
                      disabled={!liveLtp || !isBridgeOnline || signal === 'WAIT'}
                      className="w-full py-2 bg-[#D4AF37] disabled:bg-[#1E293B] disabled:text-[#64748B] text-[#070E1C] font-bold rounded text-xs flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Lock {hz}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-[#0D182E] border border-[#D4AF37]/30 rounded-xl overflow-hidden">
        <div className="p-3 bg-[#111F38] border-b border-[#D4AF37]/20 flex flex-wrap justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#D4AF37]" />
            <span className="font-bold text-[#D4AF37]">SCORECARD (real only)</span>
          </div>
          <div className="flex gap-4 font-bold">
            <span>N={totalLockedTrades}</span>
            <span className="text-emerald-400">HIT {hits}</span>
            <span className="text-rose-400">MISS {misses}</span>
            <span>{winRate}%</span>
          </div>
        </div>
        {scorecard.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#64748B]">
            Lock after ORB break (CALL/PUT). Results appear when target, stop, or time hits.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#D4AF37]/15 bg-[#070E1C] text-[#94A3B8] sticky top-0">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Index</th>
                  <th className="p-3">H</th>
                  <th className="p-3">Side</th>
                  <th className="p-3">Entry</th>
                  <th className="p-3">Exit</th>
                  <th className="p-3">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/10">
                {scorecard.map((item) => (
                  <tr key={item.id}>
                    <td className="p-3 text-[#94A3B8]">
                      {new Date(item.resolvedAt).toLocaleTimeString('en-IN', {
                        hour12: false,
                        timeZone: 'Asia/Kolkata',
                      })}
                    </td>
                    <td className="p-3 font-bold">{item.symbol}</td>
                    <td className="p-3 text-[#D4AF37]">{item.horizon}</td>
                    <td className="p-3 font-bold">{item.direction}</td>
                    <td className="p-3">{item.entryPrice.toFixed(2)}</td>
                    <td className="p-3">{item.exitPrice.toFixed(2)}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                          item.status === 'HIT'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {item.status === 'HIT' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
        <Search className="w-4 h-4 absolute left-3 top-3 text-[#D4AF37]" />
        <input
          className="w-full bg-[#0D182E] border border-[#D4AF37]/40 rounded-xl pl-9 pr-20 py-2.5 text-xs"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="NSE symbol"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1.5 bg-[#D4AF37] text-[#070E1C] px-3 py-1 rounded-lg text-xs font-bold"
        >
          Load
        </button>
      </form>
      <RealTradingViewChart symbol={`NSE:${sym}`} height={520} />
    </div>
  )
}

export const InstitutionalFlowsDesk: React.FC = () => (
  <div className="p-6 bg-[#0D182E] border border-[#D4AF37]/30 rounded-xl text-xs text-[#94A3B8] space-y-2">
    <p>Use official NSE FII/DII EOD — no fake live institutional feed.</p>
    <a
      className="text-[#D4AF37] underline"
      href="https://www.nseindia.com/reports/fii-dii"
      target="_blank"
      rel="noreferrer"
    >
      NSE FII/DII
    </a>
  </div>
)

export const VisualNewsWireDesk: React.FC = () => (
  <div className="h-[520px] rounded-xl overflow-hidden border border-[#D4AF37]/30">
    <iframe
      title="news"
      className="w-full h-full border-none"
      src="https://s.tradingview.com/embed-widget/timeline/?locale=en#%7B%22feedMode%22%3A%22symbol%22%2C%22symbol%22%3A%22NSE%3ANIFTY%22%2C%22colorTheme%22%3A%22dark%22%2C%22isTransparent%22%3Atrue%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%7D"
    />
  </div>
)

export const SectorEtfMatrix: React.FC = () => (
  <div className="p-6 text-xs text-[#94A3B8]">Screener → SILVERBEES, GOLDBEES, ITBEES</div>
)

export const RiskProtocolDesk: React.FC = () => (
  <div className="p-6 bg-[#0D182E] border border-[#D4AF37]/30 rounded-xl text-xs text-[#94A3B8] space-y-2">
    <p>1.5% max risk · no lock on WAIT · journal every resolve</p>
  </div>
)

export default FoDecisionDesk
