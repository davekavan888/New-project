import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DataHealthBadge } from '@/components/DataHealthBadge'
import { useAngelLiveFeed } from '@/hooks/useAngelLiveFeed'
import { buildForecast30 } from '@/services/forecast30'
import { Layers, RefreshCw, ShieldAlert } from 'lucide-react'

const BRIDGE = (import.meta.env.VITE_ANGEL_BRIDGE_URL as string | undefined)?.replace(/\/$/, '')

type Row = {
  strike: number
  callLtp: number | null
  callOi: number | null
  putLtp: number | null
  putOi: number | null
}

type ChainRes = {
  ok?: boolean
  spot: number | null
  expiry: string | null
  rows: Row[]
  status: string
  error?: string
  guide?: {
    pcr: number | null
    maxPain: number | null
    resistanceZone: number | null
    supportZone: number | null
    bias: string
    notes: string[]
  }
  disclaimer?: string
}

function nearestStrikes(spot: number, step = 50, count = 4): { up: number[]; down: number[] } {
  const base = Math.round(spot / step) * step
  const up: number[] = []
  const down: number[] = []
  for (let i = 1; i <= count; i++) {
    up.push(base + i * step)
    down.push(base - i * step)
  }
  return { up, down }
}

export function OptionChainPage() {
  const { data: live } = useAngelLiveFeed()
  const liveSpot = (live.ltp as Record<string, number> | undefined)?.NIFTY ?? null
  const bridgeLive =
    live.status === 'live' || live.source === 'angel-rest-ltp'

  const [data, setData] = useState<ChainRes | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    if (!BRIDGE) {
      setErr('Set VITE_ANGEL_BRIDGE_URL on Vercel for chain data')
      return
    }
    setLoading(true)
    setErr('')
    try {
      const r = await fetch(`${BRIDGE}/option-chain`, { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok || j.ok === false) throw new Error(j.error || j.message || 'chain_failed')
      setData(j as ChainRes)
    } catch (e) {
      setErr(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), 45_000)
    return () => clearInterval(t)
  }, [load])

  const spot = data?.spot ?? liveSpot
  const isLive = bridgeLive && data?.status === 'ok' && spot != null

  const forecast = useMemo(
    () =>
      buildForecast30({
        symbol: 'NIFTY',
        last: spot,
        dataStatus: isLive ? 'live' : 'unavailable',
        technical: live.factors?.components?.technical,
        optionsFlow: live.factors?.components?.optionsFlow,
        breadth: live.factors?.components?.breadth,
      }),
    [spot, isLive, live.factors],
  )

  const levels = useMemo(() => {
    if (spot == null) return { up: [] as number[], down: [] as number[] }
    return nearestStrikes(spot, 50, 4)
  }, [spot])

  const bias = forecast.confidence < 45 ? 'neutral' : forecast.bias
  const greenSet = new Set(bias === 'bullish' ? levels.up : [])
  const redSet = new Set(bias === 'bearish' ? levels.down : [])
  const neutralBand =
    bias === 'range' || bias === 'neutral'
      ? new Set(
          spot != null
            ? [
                Math.round(spot / 50) * 50,
                Math.round(spot / 50) * 50 + 50,
                Math.round(spot / 50) * 50 - 50,
              ]
            : [],
        )
      : new Set<number>()

  const tradeIdea = useMemo(() => {
    if (!isLive || spot == null) return null
    if (forecast.confidence < 45 || bias === 'range' || bias === 'neutral') {
      return {
        title: 'No option idea — wait',
        body: 'Confidence is low or range regime. Prefer NO TRADE until Decision Desk clears.',
        tone: 'neu' as const,
      }
    }
    if (bias === 'bullish') {
      const t1 = levels.up[0]
      const t2 = levels.up[1]
      return {
        title: `Illustrative CE bias toward ${t2 ?? t1}`,
        body: `Spot ~${spot.toFixed(0)}. Upside references ${t1} / ${t2}. Invalidation: sustained break below ${levels.down[0]}. Educational only — not an order.`,
        tone: 'pos' as const,
      }
    }
    if (bias === 'bearish') {
      const t1 = levels.down[0]
      const t2 = levels.down[1]
      return {
        title: `Illustrative PE bias toward ${t2 ?? t1}`,
        body: `Spot ~${spot.toFixed(0)}. Downside references ${t1} / ${t2}. Invalidation: sustained break above ${levels.up[0]}. Educational only — not an order.`,
        tone: 'neg' as const,
      }
    }
    return null
  }, [isLive, spot, forecast.confidence, bias, levels])

  const rowClass = (strike: number) => {
    if (greenSet.has(strike)) return 'bg-[rgba(45,143,111,0.14)]'
    if (redSet.has(strike)) return 'bg-[rgba(179,58,58,0.1)]'
    if (neutralBand.has(strike)) return 'bg-[rgba(26,95,158,0.08)]'
    return ''
  }

  const health = isLive ? 'live' : data?.status === 'ok' ? 'delayed' : 'unavailable'

  return (
    <div className="space-y-4">
      <div className="nf-art-line" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0f1b2d] flex items-center gap-2">
            <Layers className="h-6 w-6 text-[#c9a227]" />
            Nifty Chain
          </h1>
          <p className="text-sm text-[#5a6b82] flex flex-wrap items-center gap-2 mt-1">
            Nearest expiry · analysis highlights
            <DataHealthBadge status={health} />
            {data?.expiry && (
              <span className="text-xs font-semibold text-[#1a5f9e]">Expiry {data.expiry}</span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Legend */}
      <Card>
        <div className="text-xs font-semibold text-[#0f1b2d] mb-2">Colour legend</div>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="rounded-full px-2.5 py-1 font-semibold bg-[rgba(45,143,111,0.15)] text-[#1a5c47] border border-[rgba(45,143,111,0.35)]">
            Green — upside focus (bullish bias)
          </span>
          <span className="rounded-full px-2.5 py-1 font-semibold bg-[rgba(179,58,58,0.1)] text-[#8a2a2a] border border-[rgba(179,58,58,0.3)]">
            Red — downside focus (bearish bias)
          </span>
          <span className="rounded-full px-2.5 py-1 font-semibold bg-[rgba(26,95,158,0.1)] text-[#1a5f9e] border border-[rgba(26,95,158,0.25)]">
            Blue — neutral / range / ATM band
          </span>
        </div>
      </Card>

      {!isLive && (
        <Card className="border border-[rgba(179,58,58,0.25)] bg-[rgba(179,58,58,0.05)]">
          <div className="flex gap-2 text-sm text-[#0f1b2d]">
            <ShieldAlert className="h-4 w-4 text-[#b33a3a] shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">LIVE unavailable</div>
              <p className="text-[#5a6b82] mt-0.5">
                Chain analysis and option trade ideas stay hidden until Angel bridge is LIVE and chain
                returns data. Fix Railway session / VITE_ANGEL_BRIDGE_URL, then Refresh.
              </p>
              {err && <p className="text-xs text-[#b33a3a] mt-1">{err}</p>}
            </div>
          </div>
        </Card>
      )}

      {isLive && tradeIdea && (
        <Card
          className={
            tradeIdea.tone === 'pos'
              ? 'border border-[rgba(45,143,111,0.35)] bg-[rgba(45,143,111,0.06)]'
              : tradeIdea.tone === 'neg'
                ? 'border border-[rgba(179,58,58,0.3)] bg-[rgba(179,58,58,0.05)]'
                : 'border border-[rgba(26,95,158,0.25)] bg-[rgba(26,95,158,0.05)]'
          }
        >
          <div className="text-xs font-semibold text-[#5a6b82] uppercase tracking-wide">
            Trade idea (educational)
          </div>
          <div className="text-lg font-bold text-[#0f1b2d] mt-1">{tradeIdea.title}</div>
          <p className="text-sm text-[#5a6b82] mt-1">{tradeIdea.body}</p>
          <div className="mt-2 text-xs text-[#5a6b82]">
            Model: {forecast.bias} · confidence {forecast.confidence}/100 · spot{' '}
            {spot?.toLocaleString('en-IN')}
          </div>
        </Card>
      )}

      {isLive && (
        <div className="grid gap-2 sm:grid-cols-4 text-sm">
          <Card>
            <div className="text-[10px] font-semibold text-[#5a6b82]">Spot</div>
            <div className="font-bold tabular-nums text-[#0f1b2d]">
              {spot?.toLocaleString('en-IN')}
            </div>
          </Card>
          <Card>
            <div className="text-[10px] font-semibold text-[#5a6b82]">PCR</div>
            <div className="font-bold tabular-nums text-[#0f1b2d]">
              {data?.guide?.pcr != null ? data.guide.pcr.toFixed(2) : '—'}
            </div>
          </Card>
          <Card>
            <div className="text-[10px] font-semibold text-[#5a6b82]">Max pain ~</div>
            <div className="font-bold tabular-nums text-[#0f1b2d]">
              {data?.guide?.maxPain ?? '—'}
            </div>
          </Card>
          <Card>
            <div className="text-[10px] font-semibold text-[#5a6b82]">Bias</div>
            <div className="font-bold capitalize text-[#0f1b2d]">{bias}</div>
          </Card>
        </div>
      )}

      {isLive && data?.rows?.length ? (
        <Card className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="text-left text-[#5a6b82] border-b border-[rgba(15,40,80,0.1)]">
                <th className="py-2 pr-2">CE LTP</th>
                <th className="py-2 pr-2">CE OI</th>
                <th className="py-2 pr-2 text-center">Strike</th>
                <th className="py-2 pr-2">PE OI</th>
                <th className="py-2">PE LTP</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.strike} className={`border-b border-[rgba(15,40,80,0.05)] ${rowClass(row.strike)}`}>
                  <td className="py-1.5 pr-2 tabular-nums">{row.callLtp ?? '—'}</td>
                  <td className="py-1.5 pr-2 tabular-nums text-[#5a6b82]">{row.callOi ?? '—'}</td>
                  <td className="py-1.5 pr-2 text-center font-bold tabular-nums text-[#0f1b2d]">
                    {row.strike}
                    {greenSet.has(row.strike) && (
                      <span className="ml-1 text-[10px] text-[#1a5c47]">▲</span>
                    )}
                    {redSet.has(row.strike) && (
                      <span className="ml-1 text-[10px] text-[#8a2a2a]">▼</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums text-[#5a6b82]">{row.putOi ?? '—'}</td>
                  <td className="py-1.5 tabular-nums">{row.putLtp ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        isLive && (
          <Card className="text-sm text-[#5a6b82]">
            Chain rows empty — bridge option-chain endpoint may need market hours or token map.
          </Card>
        )
      )}

      <p className="text-[10px] text-[#5a6b82]">
        Educational decision support only — not investment advice. Highlights follow Decision model +
        spot. Execute only on your broker after your own checks.
        {data?.disclaimer ? ` ${data.disclaimer}` : ''}
      </p>
    </div>
  )
}
