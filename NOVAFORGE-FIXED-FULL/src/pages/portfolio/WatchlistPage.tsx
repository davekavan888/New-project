import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { marketService } from '@/services/market'
import { formatCurrency, formatPercent, cn } from '@/lib/utils'

export function WatchlistPage() {
  const stocks = useMemo(() => marketService.getStocks().slice(0, 8), [])
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Watchlist</h1><p className="text-sm text-zinc-400">Default · {stocks.length} symbols</p></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stocks.map((s) => (
          <Link key={s.id} to={`/stocks/${s.symbol}`}>
            <Card hover>
              <div className="font-semibold">{s.symbol}</div>
              <div className="text-xs text-zinc-500 truncate">{s.name}</div>
              <div className="mt-3 text-lg font-bold tabular-nums">{formatCurrency(s.price)}</div>
              <div className={cn('text-sm', s.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400')}>{formatPercent(s.changePercent)}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
