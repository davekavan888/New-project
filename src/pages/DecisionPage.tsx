import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DataHealthBadge } from '@/components/DataHealthBadge'
import { useAngelLiveFeed } from '@/hooks/useAngelLiveFeed'
import { buildForecast30 } from '@/services/forecast30'
import { lockCall } from '@/services/reportCard'
import { Scale, AlertTriangle, Lock, Radio, ClipboardCheck, Layers } from 'lucide-react'

export function DecisionPage() {
  const { data, connected, bridgeConfigured, refreshSnapshot, ageSec, isLive } = useAngelLiveFeed()
  const ltp = (data.ltp || {}) as Record<string, number>
  const nifty = ltp.NIFTY ?? null
  const bank = ltp.BANKNIFTY ?? null

  const health = isLive
    ? 'live'
    : data.status === 'session_ok'
      ? 'delayed'
      : data.status === 'simulated'
        ? 'demo'
        : 'unavailable'

  const forecast = useMemo(
    () =>
      buildForecast30({
        symbol: 'NIFTY',
        last: nifty,
        dataStatus: health === 'live' ? 'live' : health === 'demo' ? 'demo' : health === 'unavailable' ? 'unavailable' : 'delayed',
        technical: data.factors?.components?.technical,
        optionsFlow: data.factors?.components?.optionsFlow,
        breadth: data.factors?.components?.breadth,
      }),
    [nifty, health, data.factors],
  )

  const actionLabel =
    forecast.bias === 'bullish'
      ? 'BULLISH BIAS'
      : forecast.bias === 'bearish'
        ? 'BEARISH BIAS'
        : forecast.confidence < 45
          ? 'NO TRADE / WAIT'
          : 'RANGE / WAIT'

  const actionClass =
    forecast.bias === 'bullish' && forecast.confidence >= 45
      ? 'nf-chip-pos'
      : forecast.bias === 'bearish' && forecast.confidence >= 45
        ? 'nf-chip-neg'
        : 'nf-chip-neu'

  const onLock = () => {
    if (nifty == null) {
      alert('No NIFTY spot — check Live Terminal / bridge.')
      return
    }
    const bias =
      forecast.confidence < 45
        ? 'no_trade'
        : forecast.bias === 'bullish'
          ? 'bullish'
          : forecast.bias === 'bearish'
            ? 'bearish'
            : 'range'
    lockCall({
      symbol: 'NIFTY',
      lockSpot: nifty,
      bias,
      confidence: forecast.confidence,
      zoneLow: forecast.range?.lower ?? null,
      zoneHigh: forecast.range?.upper ?? null,
      invalidation: forecast.invalidation,
      horizonMin: 30,
      dataStatus: health,
      note: `Decision desk · ${actionLabel}`,
    })
    alert('Locked on Report Card (30 min). Open Report Card to track.')
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="nf-art-line mb-1" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0f1b2d] flex items-center gap-2">
            <Scale className="h-6 w-6 text-[#c9a227]" />
            Decision Desk
          </h1>
          <p className="text-sm text-[#5a6b82] mt-1 flex flex-wrap items-center gap-2">
            What matters now · levels · invalidation · lock
            <DataHealthBadge status={health} />
            {ageSec != null && (
              <span className="text-xs text-[#1a5f9e] font-semibold">{ageSec}s ago</span>
            )}
            {bridgeConfigured ? (
              <span className="text-xs text-[#1a5f9e]">
                {connected ? 'Bridge linked' : 'Connecting…'}
              </span>
            ) : (
              <span className="text-xs text-[#b33a3a]">Set VITE_ANGEL_BRIDGE_URL</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void refreshSnapshot()}>
            Refresh
          </Button>
          <Button size="sm" onClick={onLock} disabled={nifty == null}>
            <Lock className="h-3.5 w-3.5" />
            Lock 30m
          </Button>
        </div>
      </div>

      {/* Spot strip */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <div className="text-xs font-semibold text-[#5a6b82] uppercase tracking-wide">Nifty 50</div>
          <div className="text-3xl font-bold tabular-nums text-[#0f1b2d] mt-1">
            {nifty != null ? nifty.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}
          </div>
        </Card>
        <Card>
          <div className="text-xs font-semibold text-[#5a6b82] uppercase tracking-wide">Bank Nifty</div>
          <div className="text-3xl font-bold tabular-nums text-[#0f1b2d] mt-1">
            {bank != null ? bank.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}
          </div>
        </Card>
      </div>

      {/* Verdict hero */}
      <Card className="relative overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: 'linear-gradient(90deg, #c9a227, #1a5f9e, #2d8f6f)' }}
        />
        <div className="pt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-[#5a6b82]">Current view</div>
            <div className={`inline-flex mt-2 rounded-full px-3 py-1 text-sm font-bold ${actionClass}`}>
              {actionLabel}
            </div>
            <div className="mt-3 text-4xl font-bold text-[#0f1b2d] tabular-nums">
              {forecast.confidence}
              <span className="text-lg font-semibold text-[#5a6b82]"> / 100</span>
            </div>
            <div className="text-xs text-[#5a6b82] mt-1">Confidence · {forecast.regime}</div>
          </div>
          <div className="text-sm space-y-1 min-w-[180px]">
            <div className="flex justify-between gap-4">
              <span className="text-[#2d8f6f] font-semibold">Bull</span>
              <span className="tabular-nums font-bold">{forecast.probs.bullish}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#1a5f9e] font-semibold">Range</span>
              <span className="tabular-nums font-bold">{forecast.probs.range}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#b33a3a] font-semibold">Bear</span>
              <span className="tabular-nums font-bold">{forecast.probs.bearish}%</span>
            </div>
          </div>
        </div>

        {forecast.range && (
          <div className="mt-4 grid gap-2 sm:grid-cols-3 text-sm">
            <div className="rounded-xl border border-[rgba(15,40,80,0.1)] bg-[#f7f9fc] p-3">
              <div className="text-[10px] font-semibold text-[#5a6b82]">Lower zone</div>
              <div className="font-bold tabular-nums text-[#0f1b2d]">{forecast.range.lower}</div>
            </div>
            <div className="rounded-xl border border-[rgba(201,162,39,0.35)] bg-[rgba(201,162,39,0.08)] p-3">
              <div className="text-[10px] font-semibold text-[#a68512]">Base</div>
              <div className="font-bold tabular-nums text-[#0f1b2d]">{forecast.range.base}</div>
            </div>
            <div className="rounded-xl border border-[rgba(15,40,80,0.1)] bg-[#f7f9fc] p-3">
              <div className="text-[10px] font-semibold text-[#5a6b82]">Upper zone</div>
              <div className="font-bold tabular-nums text-[#0f1b2d]">{forecast.range.upper}</div>
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2 rounded-xl border border-[rgba(179,58,58,0.2)] bg-[rgba(179,58,58,0.05)] p-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-[#b33a3a] shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-[#0f1b2d]">What would change this view</div>
            <p className="text-[#5a6b82] mt-0.5">{forecast.invalidation}</p>
          </div>
        </div>
      </Card>

      {/* Why */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <div className="font-semibold text-[#0f1b2d] mb-2">Why (short)</div>
          <ul className="space-y-1.5 text-sm text-[#0f1b2d]">
            {forecast.reasons.slice(0, 5).map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
        </Card>
        <Card>
          <div className="font-semibold text-[#0f1b2d] mb-2">Factors</div>
          <div className="space-y-2">
            {forecast.factors.slice(0, 6).map((f) => (
              <div
                key={f.label}
                className="flex items-start justify-between gap-2 text-sm border-b border-[rgba(15,40,80,0.06)] pb-2"
              >
                <div>
                  <div className="font-semibold text-[#0f1b2d]">{f.label}</div>
                  <div className="text-xs text-[#5a6b82]">{f.detail}</div>
                </div>
                <span
                  className={
                    f.tone === 'pos'
                      ? 'text-[#2d8f6f] text-xs font-bold'
                      : f.tone === 'neg'
                        ? 'text-[#b33a3a] text-xs font-bold'
                        : 'text-[#1a5f9e] text-xs font-bold'
                  }
                >
                  {f.tone}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Link to="/live" className="glass-card p-4 flex items-center gap-3 hover:border-[#c9a227]/50">
          <Radio className="h-5 w-5 text-[#1a5f9e]" />
          <div>
            <div className="font-semibold text-sm text-[#0f1b2d]">Live Terminal</div>
            <div className="text-[11px] text-[#5a6b82]">Raw feed & factors</div>
          </div>
        </Link>
        <Link to="/report-card" className="glass-card p-4 flex items-center gap-3 hover:border-[#c9a227]/50">
          <ClipboardCheck className="h-5 w-5 text-[#2d8f6f]" />
          <div>
            <div className="font-semibold text-sm text-[#0f1b2d]">Report Card</div>
            <div className="text-[11px] text-[#5a6b82]">Score locked calls</div>
          </div>
        </Link>
        <Link to="/chain" className="glass-card p-4 flex items-center gap-3 hover:border-[#c9a227]/50">
          <Layers className="h-5 w-5 text-[#c9a227]" />
          <div>
            <div className="font-semibold text-sm text-[#0f1b2d]">Nifty Chain</div>
            <div className="text-[11px] text-[#5a6b82]">OI guide</div>
          </div>
        </Link>
      </div>

      <p className="text-[10px] text-[#5a6b82] leading-relaxed">
        {forecast.disclaimer} Personal decision support only. Compare with your broker. Prefer NO TRADE
        when confidence is low or data is not LIVE.
      </p>
    </div>
  )
}
