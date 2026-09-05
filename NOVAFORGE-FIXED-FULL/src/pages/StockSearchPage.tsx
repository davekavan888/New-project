import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { searchUniverse } from '@/services/stocks'
import { Search } from 'lucide-react'

export function StockSearchPage() {
  const [q, setQ] = useState('')
  const results = useMemo(() => searchUniverse(q), [q])

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="nf-art-line" />
      <div>
        <h1 className="text-2xl font-bold text-[#0f1b2d] flex items-center gap-2">
          <Search className="h-6 w-6 text-[#1a5f9e]" />
          Stock search
        </h1>
        <p className="text-sm text-[#5a6b82] mt-1">
          Master snapshot · delayed public data · not a full broker terminal
        </p>
      </div>

      <Card>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, symbol, sector (e.g. power, RELIANCE, bank)"
          className="h-12 w-full rounded-xl border border-[rgba(15,40,80,0.15)] bg-white px-4 text-sm text-[#0f1b2d] outline-none focus:border-[#c9a227]"
        />
      </Card>

      <div className="space-y-2">
        {results.map((r) => (
          <Link key={r.symbol} to={`/stock/${encodeURIComponent(r.symbol)}`}>
            <Card className="hover:border-[#c9a227]/50 transition-colors mb-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-[#0f1b2d]">{r.name}</div>
                  <div className="text-xs text-[#5a6b82]">
                    {r.symbol.replace('.NS', '')} · {r.sector}
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#1a5f9e]">Open →</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
