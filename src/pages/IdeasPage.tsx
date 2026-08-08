import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { IDEA_TABS, IDEAS, type IdeaStock } from '@/services/analysis'
import { formatCurrency, formatPercent, cn } from '@/lib/utils'
import { Sparkles } from 'lucide-react'

export function IdeasPage() {
  const [tab, setTab] = useState<string>('future')
  const list: IdeaStock[] = IDEAS[tab] || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-indigo-400" />
          Suggested Ideas
        </h1>
        <p className="text-sm text-zinc-400">
          Watchlist-style ideas for Groww / IND Money — filters only, not buy recommendations.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {IDEA_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition border',
              tab === t.id
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200'
                : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((s) => (
          <Card key={s.symbol + s.why} hover>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-zinc-50">{s.symbol}</div>
                <div className="text-xs text-zinc-500">{s.name}</div>
              </div>
              <div className="text-right">
                <div className="tabular-nums font-medium">{formatCurrency(s.price)}</div>
                <div className={cn('text-xs', s.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {formatPercent(s.changePercent)}
                </div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">{s.sector}</span>
              {s.theme && (
                <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-[10px] text-indigo-300">{s.theme}</span>
              )}
            </div>
            <p className="mt-3 text-sm text-zinc-300"><span className="text-zinc-500">Why: </span>{s.why}</p>
            <p className="mt-1 text-sm text-zinc-400"><span className="text-zinc-500">Risk: </span>{s.risk}</p>
            <p className="mt-2 text-sm font-medium text-indigo-200">Hint: {s.hint}</p>
          </Card>
        ))}
      </div>

      {list.length === 0 && (
        <Card><p className="text-sm text-zinc-400">No ideas in this tab yet.</p></Card>
      )}

      <Card className="text-sm text-zinc-400">
        Lists are curated/illustrative for product demo. Connect fundamental data APIs later for live 52W, book value, and valuation screens.
        Always cross-check on Groww or IND Money before any trade.
      </Card>
    </div>
  )
}
