import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { marketService } from '@/services/market'
import { formatCurrency, formatPercent, formatCompact, cn } from '@/lib/utils'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

export function MarketsPage() {
  const stocks = useMemo(() => marketService.getStocks(), [])
  const [q, setQ] = useState('')
  const filtered = stocks.filter(
    (s) => s.symbol.toLowerCase().includes(q.toLowerCase()) || s.name.toLowerCase().includes(q.toLowerCase()) || s.sector.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Markets</h1>
          <p className="text-sm text-zinc-400">NSE instruments · live-style quotes</p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter symbol, name, sector…"
          className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm sm:w-72 outline-none focus:border-indigo-500"
        />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Change</th>
                <th className="px-4 py-3 hidden md:table-cell">Volume</th>
                <th className="px-4 py-3 hidden lg:table-cell">Mkt Cap</th>
                <th className="px-4 py-3 hidden sm:table-cell">Sector</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-zinc-800/80 hover:bg-zinc-900/50">
                  <td className="px-4 py-3">
                    <Link to={`/stocks/${s.symbol}`} className="block">
                      <div className="font-medium">{s.symbol}</div>
                      <div className="text-xs text-zinc-500">{s.name}</div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 tabular-nums font-medium">{formatCurrency(s.price)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center gap-0.5 tabular-nums font-medium', s.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {s.changePercent >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      {formatPercent(s.changePercent)}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-400 hidden md:table-cell">{formatCompact(s.volume)}</td>
                  <td className="px-4 py-3 tabular-nums text-zinc-400 hidden lg:table-cell">₹{formatCompact(s.marketCap / 1e7)} Cr</td>
                  <td className="px-4 py-3 text-zinc-400 hidden sm:table-cell">{s.sector}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
