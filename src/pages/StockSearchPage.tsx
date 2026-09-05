import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { searchUniverse, fetchStockQuote, type StockQuote, UNIVERSE } from '@/services/stocks'
import { Search, Crown, RefreshCw } from 'lucide-react'

export function StockSearchPage() {
  const [q, setQ] = useState('')
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({})
  const [loading, setLoading] = useState(false)
  const results = useMemo(() => searchUniverse(q), [q])

  const loadQuotes = async (symbols: string[]) => {
    setLoading(true)
    const next: Record<string, StockQuote> = { ...quotes }
    // batch sequential to avoid rate limits
    for (const sym of symbols.slice(0, 12)) {
      if (next[sym]?.price != null) continue
      try {
        next[sym] = await fetchStockQuote(sym)
        setQuotes({ ...next })
      } catch {
        /* skip */
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadQuotes(results.map((r) => r.symbol))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  useEffect(() => {
    // initial top names
    void loadQuotes(UNIVERSE.slice(0, 10).map((u) => u.symbol))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="nf-art-line" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1520] flex items-center gap-2">
            <Crown className="h-6 w-6 text-[#c9a227]" />
            Royal stock search
          </h1>
          <p className="text-sm text-[#5c5348] mt-1">
            Live-ish public quotes (often delayed) · open any name for full card & charts
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setQuotes({})
            void loadQuotes(results.map((r) => r.symbol))
          }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh prices
        </Button>
      </div>

      <Card>
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-[#c9a227]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search — RELIANCE, bank, power, TCS…"
            className="h-11 w-full rounded-xl border border-[rgba(90,60,20,0.15)] bg-[#fffdf8] px-3 text-sm text-[#1a1520] outline-none focus:border-[#c9a227]"
          />
        </div>
      </Card>

      <div className="space-y-2">
        {results.map((r) => {
          const qq = quotes[r.symbol]
          const px = qq?.price
          const ch = qq?.changePct
          return (
            <Link key={r.symbol} to={`/stock/${encodeURIComponent(r.symbol)}`}>
              <Card className="mb-2 hover:border-[#c9a227]/60">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#1a1520]">{r.name}</div>
                    <div className="text-xs text-[#5c5348]">
                      {r.symbol.replace('.NS', '').replace('^', '')} · {r.sector}
                      {qq?.source && (
                        <span className="ml-2 text-[10px] font-semibold text-[#1e3a5f]">
                          {qq.source}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold tabular-nums text-[#1a1520]">
                      {px != null ? px.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : loading ? '…' : '—'}
                    </div>
                    <div
                      className={`text-xs font-semibold ${
                        ch == null ? 'text-[#5c5348]' : ch >= 0 ? 'text-[#1f6b4a]' : 'text-[#6b2c3e]'
                      }`}
                    >
                      {ch != null ? `${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%` : '—'}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
      <p className="text-[10px] text-[#5c5348]">
        Quotes from public market data feeds — often delayed. Not a broker. Educational use.
      </p>
    </div>
  )
}
