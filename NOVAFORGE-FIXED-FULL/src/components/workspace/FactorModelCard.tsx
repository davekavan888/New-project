import { Card } from '@/components/ui/Card'
import type { LiveSnapshot } from '@/hooks/useAngelLiveFeed'

export function FactorModelCard({ factors }: { factors?: LiveSnapshot['factors'] }) {
  const f = factors || {
    score: 58,
    weights: { technical: 0.3, optionsFlow: 0.4, marketBreadth: 0.3 },
    components: { technical: 55, optionsFlow: 60, breadth: 56 },
  }
  const rows = [
    { key: 'Technical', w: f.weights.technical, v: f.components.technical, color: 'bg-[#7eb8d4]' },
    { key: 'Options flow', w: f.weights.optionsFlow, v: f.components.optionsFlow, color: 'bg-[#6b4f3a]' },
    { key: 'Market breadth', w: f.weights.marketBreadth, v: f.components.breadth, color: 'bg-[#7cbc6e]' },
  ]
  return (
    <Card>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-[#7a6a5c]">Direction model (weighted)</div>
          <div className="text-3xl font-bold text-[#2c241c]">{f.score}</div>
        </div>
        <div className="text-[10px] font-medium text-[#7a6a5c] text-right">
          Tech 30% · Options 40% · Breadth 30%
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <div key={r.key}>
            <div className="flex justify-between text-xs text-[#4a3428] mb-1">
              <span>
                {r.key}{' '}
                <span className="text-[#7a6a5c]">({Math.round(r.w * 100)}%)</span>
              </span>
              <span className="tabular-nums font-semibold text-[#2c241c]">{Math.round(r.v)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#e8dfd0] overflow-hidden border border-[#6b4f3a]/10">
              <div className={`h-full ${r.color}`} style={{ width: `${Math.min(100, r.v)}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-[#7a6a5c]">
        Educational composite — not a trade signal. Weights are fixed product design.
      </p>
    </Card>
  )
}
