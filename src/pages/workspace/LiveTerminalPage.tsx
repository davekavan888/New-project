import { ModeToggle } from '@/components/workspace/ModeToggle'
import { FactorModelCard } from '@/components/workspace/FactorModelCard'
import { useWorkspaceMode } from '@/stores/workspaceMode'
import { useAngelLiveFeed } from '@/hooks/useAngelLiveFeed'
import { DataHealthBadge } from '@/components/DataHealthBadge'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { Activity, Radio } from 'lucide-react'

const MACRO = [
  { name: 'USD/INR', value: '—', chg: 'ref' },
  { name: 'Crude', value: '—', chg: 'ref' },
  { name: 'US Futures', value: '—', chg: 'ref' },
  { name: 'India 10Y', value: '—', chg: 'ref' },
]

export function LiveTerminalPage() {
  const { mode } = useWorkspaceMode()
  const { data, connected, bridgeConfigured, refreshSnapshot } = useAngelLiveFeed()
  const pro = mode === 'pro'
  const ltp = (data.ltp || {}) as Record<string, number>
  const health =
    data.status === 'live' || data.source === 'angel-rest-ltp'
      ? 'live'
      : data.status === 'session_ok'
        ? 'delayed'
        : data.status === 'simulated'
          ? 'demo'
          : 'unavailable'

  return (
    <div className={cn('space-y-4', pro && 'space-y-2 text-[13px]')}>
      <div className={cn('flex flex-wrap items-center justify-between gap-3', pro && 'mb-1')}>
        <div>
          <h1 className={cn('font-bold flex items-center gap-2', pro ? 'text-lg' : 'text-2xl')}>
            <Activity className="h-5 w-5 text-indigo-400" />
            Live Terminal
          </h1>
          <p className="text-xs text-zinc-500 flex items-center gap-2 flex-wrap">
            Angel bridge · REST LTP poll
            <DataHealthBadge status={health} />
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <Radio className={cn('h-3.5 w-3.5', connected ? 'text-emerald-400' : 'text-zinc-600')} />
            {bridgeConfigured ? (connected ? 'Bridge connected' : 'Connecting…') : 'Set VITE_ANGEL_BRIDGE_URL'}
          </div>
          <ModeToggle />
        </div>
      </div>

      {!bridgeConfigured && (
        <Card className="border-amber-500/20 bg-amber-500/5 text-sm text-zinc-300">
          Set <code className="text-amber-200">VITE_ANGEL_BRIDGE_URL</code> on Vercel to your Railway bridge URL.
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {['NIFTY', 'BANKNIFTY'].map((sym) => (
          <Card key={sym}>
            <div className="text-xs text-zinc-500">{sym}</div>
            <div className="text-2xl font-bold tabular-nums mt-1">
              {ltp[sym] != null ? ltp[sym].toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">{data.status || '—'}</div>
          </Card>
        ))}
        <Card>
          <div className="text-xs text-zinc-500">Feed</div>
          <div className="text-lg font-semibold capitalize mt-1">{data.status}</div>
          <div className="text-[10px] text-zinc-500">
            {data.ts ? new Date(data.ts).toLocaleTimeString() : '—'}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-zinc-500">Source</div>
          <div className="text-sm mt-1">{String((data as { source?: string }).source || '—')}</div>
          <button onClick={refreshSnapshot} className="mt-2 text-xs text-indigo-400">
            Refresh snapshot
          </button>
        </Card>
      </div>

      <div className={cn('grid gap-3', pro ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
        <FactorModelCard factors={data.factors} />
        <Card className={cn(pro && 'p-3', pro && 'lg:col-span-2')}>
          <div className="text-xs text-zinc-500 mb-2">Global macro matrix</div>
          <div className={cn('grid gap-2', pro ? 'grid-cols-4' : 'grid-cols-2')}>
            {MACRO.map((m) => (
              <div key={m.name} className="rounded-lg bg-zinc-900/80 p-2">
                <div className="text-[10px] text-zinc-500">{m.name}</div>
                <div className="font-semibold tabular-nums">{m.value}</div>
                <div className="text-[10px] text-zinc-400">{m.chg}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {pro && (
        <Card className="p-2 font-mono text-[11px] text-zinc-400 overflow-auto max-h-40">
          <pre className="whitespace-pre-wrap">{JSON.stringify(data, null, 2).slice(0, 1500)}</pre>
        </Card>
      )}

      {!pro && (
        <Card>
          <div className="font-semibold">Retail note</div>
          <p className="text-sm text-zinc-400 mt-2">
            LIVE = Angel REST LTP (few seconds delay). Compare with NSE/Angel app. Educational only — not advice.
          </p>
        </Card>
      )}
    </div>
  )
}
