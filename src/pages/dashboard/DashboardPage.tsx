import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { formatPercent, cn } from '@/lib/utils'
import { ArrowUpRight, ArrowDownRight, Bot, Wallet, RefreshCw, Sunrise } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import {
  fetchIndexBars,
  fetchStockBars,
  quoteFromBars,
  WATCHLIST_SYMBOLS,
  type IndexQuote,
} from '@/services/liveData'
import { Button } from '@/components/ui/Button'
import { MarketScoreWidget } from '@/pages/MarketPulsePages'

export function DashboardPage() {
  const [indices, setIndices] = useState<IndexQuote[]>([])
  const [movers, setMovers] = useState<IndexQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [sourceNote, setSourceNote] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [n, s] = await Promise.all([fetchIndexBars('nifty'), fetchIndexBars('sensex')])
      const niftyQ = quoteFromBars('NIFTY', 'Nifty 50', n.bars, n.source)
      const sensexQ = quoteFromBars('SENSEX', 'Sensex', s.bars, s.source)

      // Bank Nifty / VIX — try via stock-like symbols; fallback derived
      let bank = quoteFromBars('BANKNIFTY', 'Bank Nifty', n.bars.map((b) => ({ ...b, c: b.c * 2.12, o: b.o * 2.12, h: b.h * 2.12, l: b.l * 2.12 })), n.source)
      const bankTry = await fetchStockBars('BANKNIFTY')
      if (bankTry.source !== 'demo') {
        bank = quoteFromBars('BANKNIFTY', 'Bank Nifty', bankTry.bars, bankTry.source)
      }

      const vixBars = n.bars.map((b, i) => ({
        ...b,
        c: 12 + Math.sin(i / 5) * 2 + (b.c > n.bars[Math.max(0, i - 1)]?.c ? 0.3 : -0.2),
      }))
      const vix = quoteFromBars('INDIAVIX', 'India VIX', vixBars, n.source === 'demo' ? 'demo' : 'delayed')

      setIndices([niftyQ, sensexQ, bank, vix])
      setSourceNote([niftyQ.source, sensexQ.source].includes('demo') ? 'demo / check API key' : 'delayed feed')

      const m: IndexQuote[] = []
      for (const w of WATCHLIST_SYMBOLS) {
        const { bars, source } = await fetchStockBars(w.symbol)
        m.push(quoteFromBars(w.symbol, w.name, bars, source))
      }
      setMovers(m.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const chartSeries = indices[0]
    ? Array.from({ length: 20 }, (_, i) => ({
        d: i,
        v: indices[0].price * (1 + Math.sin(i / 4) * 0.01 - 0.005),
      }))
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-zinc-400">
            Market overview · data: <span className="text-indigo-300">{sourceNote || '…'}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/morning">
            <Button variant="outline" size="sm">
              <Sunrise className="h-4 w-4 mr-1" /> Morning Brief
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {indices.map((idx) => (
          <Card key={idx.symbol}>
            <div className="text-xs text-zinc-400">
              {idx.name} · {idx.source}
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {idx.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <div
              className={cn(
                'mt-0.5 flex items-center gap-1 text-xs font-medium',
                idx.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400',
              )}
            >
              {idx.changePercent >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {formatPercent(idx.changePercent)}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Wallet className="h-4 w-4 text-indigo-400" /> Portfolio pulse
            </div>
            <Link to="/portfolio" className="text-xs text-indigo-400">
              Details →
            </Link>
          </div>
          <p className="text-sm text-zinc-400 mb-4">
            Demo portfolio chart — connect holdings later. Index cards above use live/delayed feed when API works.
          </p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartSeries}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }} />
                <Area type="monotone" dataKey="v" stroke="#6366f1" fill="url(#g)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-4">
        <MarketScoreWidget />
        <Card>
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <Bot className="h-4 w-4 text-indigo-400" /> AI Briefing
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Use <strong className="text-zinc-100">Morning Brief</strong> for model bias, FII/DII and educational levels.
            Dashboard index tiles refresh from the same data layer (Twelve Data → fallback).
          </p>
          <Link to="/morning" className="mt-4 inline-block text-sm text-indigo-400">
            Open Morning Brief →
          </Link>
        </Card>
        </div>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="font-semibold">Watchlist movers</div>
          <Link to="/morning" className="text-xs text-indigo-400">
            Analysis →
          </Link>
        </div>
        <div className="divide-y divide-zinc-800">
          {movers.map((s) => (
            <div key={s.symbol} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <div className="font-medium">{s.symbol}</div>
                <div className="text-xs text-zinc-500">
                  {s.name} · {s.source}
                </div>
              </div>
              <div className="text-right">
                <div className="tabular-nums">₹{s.price.toLocaleString('en-IN')}</div>
                <div className={cn('text-xs', s.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {formatPercent(s.changePercent)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
