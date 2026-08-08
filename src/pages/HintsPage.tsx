import { Card } from '@/components/ui/Card'
import { getTodayHints, FII_DII_RECENT, EXPIRY_STATS } from '@/services/analysis'
import { Link } from 'react-router-dom'
import { Lightbulb, ExternalLink, AlertTriangle } from 'lucide-react'

export function HintsPage() {
  const hints = getTodayHints()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-indigo-400" />
          Next-Step Hints
        </h1>
        <p className="text-sm text-zinc-400">
          Decision support for trades you place on <span className="text-zinc-200">Groww</span> &{' '}
          <span className="text-zinc-200">IND Money</span> — not order execution here.
        </p>
      </div>

      <Card className="border border-amber-500/20 bg-amber-500/5">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
          <div className="text-sm text-zinc-300">
            <strong className="text-amber-200">Education / research only.</strong> No guaranteed returns.
            ORIONIS does not place trades. You execute on Groww or IND Money at your own risk.
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {hints.map((h) => (
          <Card key={h.title} hover>
            <div className="text-xs uppercase tracking-wide text-indigo-300 mb-1">{h.title}</div>
            <p className="text-sm text-zinc-300 leading-relaxed">{h.body}</p>
            <p className="mt-3 text-sm font-medium text-zinc-100">→ {h.action}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 font-semibold">Quick FII / DII pulse</div>
          <div className="space-y-2 text-sm">
            {FII_DII_RECENT.slice(-5).map((r) => (
              <div key={r.date + r.fii} className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-500">{r.date}</span>
                <span className={r.fii >= 0 ? 'text-emerald-400' : 'text-red-400'}>FII {r.fii >= 0 ? '+' : ''}{r.fii}</span>
                <span className={r.dii >= 0 ? 'text-emerald-400' : 'text-red-400'}>DII {r.dii >= 0 ? '+' : ''}{r.dii}</span>
              </div>
            ))}
          </div>
          <Link to="/analysis" className="mt-3 inline-block text-xs text-indigo-400">Full analysis →</Link>
        </Card>
        <Card>
          <div className="mb-2 font-semibold">{EXPIRY_STATS.title}</div>
          <p className="text-sm text-zinc-400 mb-3">Sample windows: {EXPIRY_STATS.samples} (illustrative)</p>
          <p className="text-sm text-zinc-300">{EXPIRY_STATS.hint}</p>
          <Link to="/analysis" className="mt-3 inline-block text-xs text-indigo-400">Expiry & Budget labs →</Link>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold">Execute elsewhere</div>
            <p className="text-sm text-zinc-400">Use hints here → place trades on your broker apps.</p>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-2 text-zinc-300">
              Groww <ExternalLink className="h-3 w-3" />
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-2 text-zinc-300">
              IND Money <ExternalLink className="h-3 w-3" />
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}
