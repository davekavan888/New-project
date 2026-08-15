import { Card } from '@/components/ui/Card'
import type { LiveSnapshot } from '@/hooks/useAngelLiveFeed'

export function FactorModelCard({ factors }: { factors?: LiveSnapshot['factors'] }) {
  const f = factors || {
    score: 58,
    weights: { technical: 0.3, optionsFlow: 0.4, marketBreadth: 0.3 },
    components: { technical: 55, optionsFlow: 60, breadth: 56 },
  }
  const rows = [
    { key: 'Technical', w: f.weights.technical, v: f.components.technical, color: 'bg-sky-500' },
    { key: 'Options flow', w: f.weights.optionsFlow, v: f.components.optionsFlow, color: 'bg-indigo-500' },
    { key: 'Market breadth', w: f.weights.marketBreadth, v: f.components.breadth, color: 'bg-emerald-500' },
  ]
  return (
    <Card>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-xs text-zinc-500">Direction model (weighted)</div>
          <div className="text-3xl font-bold text-indigo-300">{f.score}</div>
        </div>
        <div className="text-[10px] text-zinc-500 text-right">Tech 30% · Options 40% · Breadth 30%</div>
      </div>
      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <div key={r.key}>
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>
                {r.key} <span className="text-zinc-600">({Math.round(r.w * 100)}%)</span>
              </span>
              <span className="tabular-nums text-zinc-200">{Math.round(r.v)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div className={`h-full ${r.color}`} style={{ width: `${Math.min(100, r.v)}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-zinc-500">
        Educational composite — not a trade signal. Weights are fixed product design.
      </p>
    </Card>
  )
}
