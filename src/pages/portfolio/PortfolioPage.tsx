import { Card } from '@/components/ui/Card'
import { formatCurrency, formatPercent, cn } from '@/lib/utils'

const HOLDINGS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', qty: 50, avg: 2650, price: 2850 },
  { symbol: 'TCS', name: 'Tata Consultancy', qty: 30, avg: 3800, price: 4120 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', qty: 80, avg: 1520, price: 1680 },
  { symbol: 'INFY', name: 'Infosys', qty: 60, avg: 1720, price: 1850 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', qty: 100, avg: 1100, price: 1240 },
]

export function PortfolioPage() {
  const rows = HOLDINGS.map((h) => {
    const invested = h.qty * h.avg
    const value = h.qty * h.price
    const pnl = value - invested
    const pnlPct = (pnl / invested) * 100
    return { ...h, invested, value, pnl, pnlPct }
  })
  const totalValue = rows.reduce((s, r) => s + r.value, 0)
  const totalInvested = rows.reduce((s, r) => s + r.invested, 0)
  const totalPnl = totalValue - totalInvested

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <p className="text-sm text-zinc-400">Main portfolio · INR</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <div className="text-xs text-zinc-400">Current Value</div>
          <div className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(totalValue)}</div>
        </Card>
        <Card>
          <div className="text-xs text-zinc-400">Invested</div>
          <div className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(totalInvested)}</div>
        </Card>
        <Card>
          <div className="text-xs text-zinc-400">Total P&L</div>
          <div className={cn('mt-1 text-xl font-bold tabular-nums', totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {formatCurrency(totalPnl)} ({formatPercent((totalPnl / totalInvested) * 100)})
          </div>
        </Card>
      </div>
      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Avg</th>
              <th className="px-4 py-3">LTP</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">P&L</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.symbol} className="border-b border-zinc-800/80">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.symbol}</div>
                  <div className="text-xs text-zinc-500">{r.name}</div>
                </td>
                <td className="px-4 py-3 tabular-nums">{r.qty}</td>
                <td className="px-4 py-3 tabular-nums">{formatCurrency(r.avg)}</td>
                <td className="px-4 py-3 tabular-nums">{formatCurrency(r.price)}</td>
                <td className="px-4 py-3 tabular-nums font-medium">{formatCurrency(r.value)}</td>
                <td className={cn('px-4 py-3 tabular-nums font-medium', r.pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {formatCurrency(r.pnl)}
                  <div className="text-xs">{formatPercent(r.pnlPct)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
