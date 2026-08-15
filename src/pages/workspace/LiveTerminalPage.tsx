import { ModeToggle } from '@/components/workspace/ModeToggle'
import { FactorModelCard } from '@/components/workspace/FactorModelCard'
import { useWorkspaceMode } from '@/stores/workspaceMode'
import { useAngelLiveFeed } from '@/hooks/useAngelLiveFeed'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { Activity, Radio } from 'lucide-react'

const MACRO = [
  { name: 'USD/INR', value: '83.42', chg: '+0.12%' },
  { name: 'Crude (Brent)', value: '82.1', chg: '−0.4%' },
  { name: 'US Futures', value: 'Mixed', chg: '—' },
  { name: 'India 10Y', value: '6.82%', chg: '+1bp' },
]

export function LiveTerminalPage() {
  const { mode } = useWorkspaceMode()
  const { data, connected, bridgeConfigured, refreshSnapshot } = useAngelLiveFeed()
  const pro = mode === 'pro'

  return (
    <div className={cn('space-y-4', pro && 'space-y-2 text-[13px]')}>
      <div className={cn('flex flex-wrap items-center justify-between gap-3', pro && 'mb-1')}>
        <div>
          <h1 className={cn('font-bold flex items-center gap-2', pro ? 'text-lg' : 'text-2xl')}>
            <Activity className="h-5 w-5 text-indigo-400" />
            Live Terminal
          </h1>
          <p className="text-xs text-zinc-500">
            Retail vs Pro workspace · Angel bridge when configured
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <Radio className={cn('h-3.5 w-3.5', connected ? 'text-emerald-400' : 'text-zinc-600')} />
            {bridgeConfigured ? (connected ? 'Bridge live' : 'Connecting…') : 'Bridge URL not set'}
          </div>
          <ModeToggle />
        </div>
      </div>

      {!bridgeConfigured && (
        <Card className="border-amber-500/20 bg-amber-500/5 text-sm text-zinc-300">
          Set <code className="text-amber-200">VITE_ANGEL_BRIDGE_URL</code> on Vercel to your private Angel
          bridge server. Until then, factor model shows structural defaults / simulated bridge pulses.
        </Card>
      )}

      <div className={cn('grid gap-3', pro ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
        <FactorModelCard factors={data.factors} />
        <Card className={pro ? 'p-3' : ''}>
          <div className="text-xs text-zinc-500 mb-2">Feed status</div>
          <div className="font-semibold capitalize">{data.status || '—'}</div>
          <div className="text-[10px] text-zinc-500 mt-1">ts: {data.ts ? new Date(data.ts).toLocaleTimeString() : '—'}</div>
          {data.ltp && (
            <div className="mt-3 space-y-1 text-sm">
              {Object.entries(data.ltp).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-zinc-400">{k}</span>
                  <span className="tabular-nums font-medium">{typeof v === 'number' ? v.toFixed(2) : v}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={refreshSnapshot} className="mt-3 text-xs text-indigo-400">
            Refresh snapshot
          </button>
        </Card>
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

      {pro ? (
        <div className="grid gap-2 lg:grid-cols-3">
          <Card className="p-2 font-mono text-[11px] text-zinc-400 overflow-auto max-h-48">
            <div className="text-zinc-500 mb-1">Raw tick / payload</div>
            <pre className="whitespace-pre-wrap">{JSON.stringify(data.tick || data, null, 2).slice(0, 1200)}</pre>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-zinc-500">IV Skew / GEX</div>
            <p className="text-sm text-zinc-300 mt-2">
              Spec ready: wire option chain Greeks from Angel REST + bridge calc. Show skew chart (OTM put IV −
              OTM call IV) and net GEX by strike when chain stream is active.
            </p>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-zinc-500">Strategy builder</div>
            <p className="text-sm text-zinc-300 mt-2">
              Payoff diagrams for debit spreads / iron fly — add after chain LTP stream is stable.
            </p>
          </Card>
        </div>
      ) : (
        <Card>
          <div className="font-semibold">Retail summary</div>
          <p className="text-sm text-zinc-400 mt-2">
            Model score is explained by three visible drivers (technical, options flow, breadth). Use Morning Brief
            for levels and max-loss sizing. Live ticks appear when Angel bridge is online.
          </p>
        </Card>
      )}
    </div>
  )
}
