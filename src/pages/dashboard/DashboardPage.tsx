import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { marketService } from '@/services/market'
import { formatCurrency, formatPercent, cn } from '@/lib/utils'
import { ArrowUpRight, ArrowDownRight, Bot, Wallet } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'

export function DashboardPage() {
  const indices = useMemo(() => marketService.getIndices(), [])
  const stocks = useMemo(() => marketService.getStocks().slice(0, 6), [])
  const news = useMemo(() => marketService.getNews(), [])
  const series = useMemo(
    () => Array.from({ length: 30 }, (_, i) => ({ d: i, v: 2400000 + i * 4000 + Math.sin(i / 3) * 30000 })),
    []
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-zinc-400">Market overview & portfolio pulse</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {indices.map((idx) => (
          <Card key={idx.symbol}>
            <div className="text-xs text-zinc-400">{idx.name}</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{idx.price.toLocaleString('en-IN')}</div>
            <div className={cn('mt-0.5 flex items-center gap-1 text-xs font-medium', idx.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {idx.changePercent >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {formatPercent(idx.changePercent)}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold"><Wallet className="h-4 w-4 text-indigo-400" /> Portfolio Value</div>
            <Link to="/portfolio" className="text-xs text-indigo-400">Details →</Link>
          </div>
          <div className="mb-2 text-3xl font-bold tabular-nums">₹24,82,450</div>
          <div className="mb-4 text-sm text-emerald-400">+1.24% today</div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" hide />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ background: '#14141f', border: '1px solid #32324a', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [formatCurrency(v), 'Value']} />
                <Area type="monotone" dataKey="v" stroke="#818cf8" strokeWidth={2} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2 font-semibold"><Bot className="h-4 w-4 text-indigo-400" /> AI Briefing</div>
          <div className="space-y-2 text-sm text-zinc-300 leading-relaxed">
            <p>Markets constructive. Nifty holds above key levels. FII flows improved this week.</p>
            <p><span className="text-indigo-300">Watch:</span> Banks & IT relative strength. Energy lagging.</p>
            <p>Portfolio risk remains moderate. Top-3 concentration within band.</p>
          </div>
          <Link to="/ai" className="mt-4 inline-block text-xs text-indigo-400">Open AI Copilot →</Link>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold">Top Movers</div>
            <Link to="/markets" className="text-xs text-indigo-400">All →</Link>
          </div>
          <div className="space-y-2">
            {stocks.map((s) => (
              <Link key={s.id} to={`/stocks/${s.symbol}`} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-zinc-800/60">
                <div>
                  <div className="text-sm font-medium">{s.symbol}</div>
                  <div className="text-xs text-zinc-500">{s.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm tabular-nums">{formatCurrency(s.price)}</div>
                  <div className={cn('text-xs', s.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400')}>{formatPercent(s.changePercent)}</div>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold">News Intelligence</div>
            <Link to="/news" className="text-xs text-indigo-400">All →</Link>
          </div>
          <div className="space-y-3">
            {news.map((n) => (
              <div key={n.id} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="mb-1 text-[10px] uppercase text-zinc-500">{n.source} · {n.sentiment}</div>
                <div className="text-sm leading-snug">{n.title}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
