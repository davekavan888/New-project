import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DataHealthBadge, healthFromSource } from '@/components/DataHealthBadge'
import { buildForecast30, type Forecast30 } from '@/services/forecast30'
import { useAngelLiveFeed } from '@/hooks/useAngelLiveFeed'
import { RefreshCw, Target, ShieldAlert, Activity } from 'lucide-react'

const BRIDGE = import.meta.env.VITE_ANGEL_BRIDGE_URL as string | undefined

async function fetchBridgeLtp(): Promise<{
  nifty: number | null
  status: string
  source?: string
}> {
  if (!BRIDGE) return { nifty: null, status: 'no_bridge' }
  try {
    const r = await fetch(`${BRIDGE}/snapshot`)
    const j = await r.json()
    const ltp = j?.ltp?.NIFTY ?? j?.ltp?.['NIFTY']
    return {
      nifty: typeof ltp === 'number' ? ltp : null,
      status: j?.status || 'unknown',
      source: j?.source,
    }
  } catch {
    return { nifty: null, status: 'error' }
  }
}

async function fetchYahooNifty(): Promise<{
  last: number | null
  prevClose: number | null
  high: number | null
  low: number | null
}> {
  try {
    const r = await fetch('/api/market?symbol=NSEI')
    const j = await r.json()
    return {
      last: j?.price ?? j?.regularMarketPrice ?? null,
      prevClose: j?.previousClose ?? j?.chartPreviousClose ?? null,
      high: j?.high ?? j?.regularMarketDayHigh ?? null,
      low: j?.low ?? j?.regularMarketDayLow ?? null,
    }
  } catch {
    return { last: null, prevClose: null, high: null, low: null }
  }
}

export function Forecast30Page() {
  const { data: bridgeLive } = useAngelLiveFeed()
  const [loading, setLoading] = useState(true)
  const [fc, setFc] = useState<Forecast30 | null>(null)
  const [meta, setMeta] = useState('')

  const refresh = async () => {
    setLoading(true)
    const [bridge, yahoo] = await Promise.all([fetchBridgeLtp(), fetchYahooNifty()])
    const bridgeNifty =
      bridge.nifty ??
      (typeof bridgeLive?.ltp?.['NIFTY'] === 'number' ? bridgeLive.ltp['NIFTY'] : null)

    let last = bridgeNifty ?? yahoo.last
    let dataStatus: Forecast30['dataStatus'] = 'unavailable'
    if (bridge.status === 'live' && bridgeNifty != null) dataStatus = 'live'
    else if (yahoo.last != null) dataStatus = 'delayed'
    else if (bridge.status === 'simulated') dataStatus = 'demo'

    const tech = bridgeLive?.factors?.components?.technical
    const opt = bridgeLive?.factors?.components?.optionsFlow
    const breadth = bridgeLive?.factors?.components?.breadth

    const out = buildForecast30({
      symbol: 'NIFTY',
      last,
      prevClose: yahoo.prevClose,
      dayHigh: yahoo.high,
      dayLow: yahoo.low,
      dataStatus,
      technical: tech,
      optionsFlow: opt,
      breadth,
    })
    setFc(out)
    setMeta(
      `bridge=${bridge.status}${bridge.source ? '/' + bridge.source : ''} · yahoo=${yahoo.last != null ? 'ok' : 'off'}`,
    )
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
    const t = setInterval(() => void refresh(), 45000)
    return () => clearInterval(t)
  }, [])

  const health = useMemo(() => {
    if (!fc) return 'unavailable' as const
    return fc.dataStatus === 'live'
      ? 'live'
      : fc.dataStatus === 'delayed'
        ? 'delayed'
        : fc.dataStatus === 'demo'
          ? 'demo'
          : 'unavailable'
  }, [fc])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-amber-500" />
            30-Min Desk
          </h1>
          <p className="text-sm text-zinc-500 flex flex-wrap items-center gap-2 mt-1">
            Probabilistic estimate · not a guarantee
            <DataHealthBadge status={health} />
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="border border-amber-500/20 bg-amber-500/5">
        <div className="flex gap-2 text-sm text-zinc-300">
          <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p>
            Model estimate for the next ~30 minutes only. Based on available price / derived factors.
            Missing feeds are marked. Not investment advice.
          </p>
        </div>
      </Card>

      {fc && (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Card>
              <div className="text-xs text-zinc-500">NIFTY last</div>
              <div className="text-2xl font-bold tabular-nums mt-1">
                {fc.last != null ? fc.last.toLocaleString('en-IN') : '—'}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">{fc.asOf} IST context</div>
            </Card>
            <Card>
              <div className="text-xs text-zinc-500">Bias</div>
              <div className="text-xl font-semibold capitalize mt-1 text-amber-100">{fc.bias}</div>
              <div className="text-[10px] text-zinc-500">{fc.regime}</div>
            </Card>
            <Card>
              <div className="text-xs text-zinc-500">Confidence</div>
              <div className="text-2xl font-bold mt-1">{fc.confidence}%</div>
              <div className="text-[10px] text-zinc-500">Capped · falls when data weak</div>
            </Card>
            <Card>
              <div className="text-xs text-zinc-500 flex items-center gap-1">
                <Activity className="h-3 w-3" /> Feed
              </div>
              <div className="text-sm mt-2 font-medium uppercase">{fc.dataStatus}</div>
              <div className="text-[10px] text-zinc-500 mt-1">{meta}</div>
            </Card>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <div className="text-xs text-zinc-500 mb-3">Probability (next ~30 min)</div>
              {[
                { k: 'Bullish', v: fc.probs.bullish, c: 'bg-emerald-500' },
                { k: 'Range', v: fc.probs.range, c: 'bg-amber-500' },
                { k: 'Bearish', v: fc.probs.bearish, c: 'bg-red-500' },
              ].map((r) => (
                <div key={r.k} className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{r.k}</span>
                    <span className="tabular-nums">{r.v}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div className={`h-full ${r.c}`} style={{ width: `${r.v}%` }} />
                  </div>
                </div>
              ))}
            </Card>

            <Card className="lg:col-span-2">
              <div className="text-xs text-zinc-500 mb-2">Estimated range (not a promise)</div>
              {fc.range ? (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-[10px] text-zinc-500">Lower</div>
                    <div className="text-lg font-semibold tabular-nums">{fc.range.lower}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500">Base</div>
                    <div className="text-lg font-semibold tabular-nums text-amber-200">{fc.range.base}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500">Upper</div>
                    <div className="text-lg font-semibold tabular-nums">{fc.range.upper}</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-zinc-500">DATA UNAVAILABLE</div>
              )}
              <p className="text-xs text-zinc-400 mt-4">
                Based on current data, the model estimates probabilities above — not that the market
                will reach a level.
              </p>
            </Card>
          </div>

          <Card>
            <div className="text-xs text-zinc-500 mb-1">Invalidation (mandatory)</div>
            <p className="text-sm text-zinc-200">{fc.invalidation}</p>
          </Card>

          <Card>
            <div className="text-xs text-zinc-500 mb-3">Factor strip</div>
            <div className="flex flex-wrap gap-2">
              {fc.factors.map((f) => (
                <span
                  key={f.label}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    f.tone === 'pos'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                      : f.tone === 'neg'
                        ? 'border-red-500/30 bg-red-500/10 text-red-200'
                        : 'border-zinc-600 bg-zinc-800/80 text-zinc-300'
                  }`}
                  title={f.source}
                >
                  {f.label}: {f.detail}
                </span>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-xs text-zinc-500 mb-2">Why this estimate</div>
            <ul className="space-y-1 text-sm text-zinc-300">
              {fc.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="text-[10px] text-zinc-600 mt-3">{fc.disclaimer}</p>
          </Card>
        </>
      )}
    </div>
  )
}
