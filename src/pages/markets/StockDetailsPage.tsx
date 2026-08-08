import { useParams, Link } from 'react-router-dom'
import { useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { marketService } from '@/services/market'
import { formatCurrency, formatPercent, formatCompact, cn } from '@/lib/utils'
import { ArrowLeft, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'

export function StockDetailsPage() {
  const { symbol } = useParams()
  const stock = useMemo(() => marketService.getStock(symbol || ''), [symbol])
  const history = useMemo(() => {
    let p = stock?.price || 1000
    return Array.from({ length: 60 }, (_, i) => {
      p = p * (1 + (Math.random() - 0.48) * 0.02)
      return { d: i, close: Number(p.toFixed(2)) }
    })
  }, [stock])

  if (!stock) {
    return (
      <div className="py-20 text-center">
        <p className="text-zinc-400">Stock not found</p>
        <Link to="/markets" className="mt-2 inline-block text-indigo-400 text-sm">← Back</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/markets" className="rounded-lg p-2 hover:bg-zinc-800 text-zinc-400"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{stock.symbol}</h1>
          <p className="text-sm text-zinc-400">{stock.name} · {stock.exchange} · {stock.sector}</p>
        </div>
        <Button size="sm" variant="outline">Watch</Button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="text-4xl font-bold tabular-nums">{formatCurrency(stock.price)}</div>
        <div className={cn('flex items-center gap-1 text-lg font-medium', stock.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400')}>
          {stock.changePercent >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
          {formatCurrency(Math.abs(stock.change))} ({formatPercent(stock.changePercent)})
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 font-semibold">Price</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" hide />
                <YAxis domain={['auto', 'auto']} tick={{ fill: '#6b6b8d', fontSize: 10 }} width={50} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#14141f', border: '1px solid #32324a', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="close" stroke="#818cf8" strokeWidth={2} fill="url(#sg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <div className="mb-3 font-semibold">Key stats</div>
          <div className="space-y-3 text-sm">
            {[
              ['P/E', stock.pe.toFixed(1)],
              ['Volume', formatCompact(stock.volume)],
              ['Mkt Cap', `₹${formatCompact(stock.marketCap / 1e7)} Cr`],
              ['Sector', stock.sector],
              ['Exchange', stock.exchange],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between">
                <span className="text-zinc-400">{k}</span>
                <span className="font-medium tabular-nums">{v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
