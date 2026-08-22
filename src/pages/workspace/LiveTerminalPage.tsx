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
          <h1
            className={cn(
              'font-bold flex items-center gap-2 text-[#2c241c]',
              pro ? 'text-lg' : 'text-2xl',
            )}
          >
            <Activity className="h-5 w-5 text-[#5a9a4c]" />
            Live Terminal
          </h1>
          <p className="text-xs text-[#7a6a5c] flex items-center gap-2 flex-wrap mt-1">
            Angel bridge · REST LTP poll
            <DataHealthBadge status={health} />
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-[#4a3428]">
            <Radio className={cn('h-3.5 w-3.5', connected ? 'text-[#5a9a4c]' : 'text-[#c4b5a5]')} />
            {bridgeConfigured ? (connected ? 'Bridge connected' : 'Connecting…') : 'Set VITE_ANGEL_BRIDGE_URL'}
          </div>
          <ModeToggle />
        </div>
      </div>

      {!bridgeConfigured && (
        <Card className="border border-[#7eb8d4]/50 bg-[#a8d4e6]/20 text-sm text-[#2c241c]">
          Set <code className="text-[#4a3428] font-semibold">VITE_ANGEL_BRIDGE_URL</code> on Vercel.
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {['NIFTY', 'BANKNIFTY'].map((sym) => (
          <Card key={sym}>
            <div className="text-xs font-semibold uppercase tracking-wide text-[#7a6a5c]">{sym}</div>
            <div className="text-3xl font-bold tabular-nums mt-1 text-[#2c241c]">
              {ltp[sym] != null
                ? ltp[sym].toLocaleString('en-IN', { maximumFractionDigits: 2 })
                : '—'}
            </div>
            <div className="text-[11px] font-medium mt-1 text-[#5a9a4c] capitalize">
              {data.status || '—'}
            </div>
          </Card>
        ))}
        <Card>
          <div className="text-xs font-semibold text-[#7a6a5c]">Feed</div>
          <div className="text-lg font-bold capitalize mt-1 text-[#2c241c]">{data.status}</div>
          <div className="text-[11px] text-[#7a6a5c] mt-1">
            {data.ts ? new Date(data.ts).toLocaleTimeString() : '—'}
          </div>
        </Card>
        <Card>
          <div className="text-xs font-semibold text-[#7a6a5c]">Source</div>
          <div className="text-sm mt-1 font-semibold text-[#4a3428]">
            {String((data as { source?: string }).source || '—')}
          </div>
          <button
            type="button"
            onClick={refreshSnapshot}
            className="mt-2 text-xs font-semibold text-[#2f6f9e] hover:text-[#1d4f74] underline-offset-2 hover:underline"
          >
            Refresh snapshot
          </button>
        </Card>
      </div>

      <div className={cn('grid gap-3', pro ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
        <FactorModelCard factors={data.factors} />
        <Card className={cn(pro && 'p-3', pro && 'lg:col-span-2')}>
          <div className="text-xs font-semibold text-[#7a6a5c] mb-2">Global macro matrix</div>
          <div className={cn('grid gap-2', pro ? 'grid-cols-4' : 'grid-cols-2')}>
            {MACRO.map((m) => (
              <div
                key={m.name}
                className="rounded-xl border border-[#6b4f3a]/15 bg-gradient-to-br from-[#fffdf9] to-[#eef6fa] p-3 shadow-sm"
              >
                <div className="text-[10px] font-semibold text-[#7a6a5c]">{m.name}</div>
                <div className="font-bold tabular-nums text-[#2c241c] text-lg">{m.value}</div>
                <div className="text-[10px] font-medium text-[#7eb8d4]">{m.chg}</div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#7a6a5c] mt-2">Reference slots — connect later if needed.</p>
        </Card>
      </div>

      {pro && (
        <Card className="p-3 overflow-auto max-h-40 border border-[#6b4f3a]/15">
          <pre className="whitespace-pre-wrap text-[11px] font-mono text-[#4a3428]">
            {JSON.stringify(data, null, 2).slice(0, 1500)}
          </pre>
        </Card>
      )}

      {!pro && (
        <Card>
          <div className="font-semibold text-[#2c241c]">Retail note</div>
          <p className="text-sm text-[#7a6a5c] mt-2">
            LIVE = Angel REST LTP (few seconds). Compare with NSE/Angel app. Educational only — not advice.
          </p>
        </Card>
      )}
    </div>
  )
}
