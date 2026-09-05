/**
 * Combined extra pages — Stock search/detail, News, IPO
 * Keep as ONE file so GitHub upload cannot miss sibling modules.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  educationalRating,
  fetchCandles,
  fetchStockQuote,
  formatInrCr,
  searchUniverse,
  UNIVERSE,
  type Candle,
  type StockQuote,
} from '@/services/stocks'
import { SAMPLE_NEWS, toneClasses, type ImpactTone } from '@/services/newsIntel'
import { IPO_DESK, statusStyle, type IpoStatus } from '@/services/ipo'
import {
  Search,
  Crown,
  RefreshCw,
  ArrowLeft,
  Landmark,
  ExternalLink,
} from 'lucide-react'

/* ───────── Stock Search ───────── */
export function StockSearchPage() {
  const [q, setQ] = useState('')
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({})
  const [loading, setLoading] = useState(false)
  const results = useMemo(() => searchUniverse(q), [q])

  const loadQuotes = async (symbols: string[]) => {
    setLoading(true)
    const next: Record<string, StockQuote> = { ...quotes }
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
            Public quotes (often delayed) · open any name for details
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
          Refresh
        </Button>
      </div>
      <Card>
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-[#c9a227]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search — RELIANCE, bank, power…"
            className="h-11 w-full rounded-xl border border-[rgba(90,60,20,0.15)] bg-[#fffdf8] px-3 text-sm outline-none focus:border-[#c9a227]"
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
              <Card className="mb-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#1a1520]">{r.name}</div>
                    <div className="text-xs text-[#5c5348]">
                      {r.symbol.replace('.NS', '').replace('^', '')} · {r.sector}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold tabular-nums">
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
    </div>
  )
}

/* ───────── Stock Detail ───────── */
const CHART_MODES = [
  { id: 'close', label: 'Close', tip: 'Price path' },
  { id: 'range', label: 'High-Low', tip: 'Range band' },
  { id: 'ma20', label: 'vs 20DMA', tip: 'Short average' },
  { id: 'vol', label: 'Volume', tip: 'Participation' },
  { id: 'pos52', label: '52W pos', tip: 'In 52W range' },
] as const

export function StockDetailPage() {
  const { symbol: raw } = useParams()
  const symbol = decodeURIComponent(raw || 'RELIANCE.NS')
  const [q, setQ] = useState<StockQuote | null>(null)
  const [candles, setCandles] = useState<Candle[]>([])
  const [mode, setMode] = useState<(typeof CHART_MODES)[number]['id']>('close')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let on = true
    setLoading(true)
    Promise.all([fetchStockQuote(symbol), fetchCandles(symbol, '6mo', '1d')]).then(([qq, cc]) => {
      if (!on) return
      setQ(qq)
      setCandles(cc)
      setLoading(false)
    })
    return () => {
      on = false
    }
  }, [symbol])

  const rating = useMemo(() => (q ? educationalRating(q) : null), [q])
  const chartData = useMemo(() => {
    if (!candles.length) return []
    const closes = candles.map((c) => c.c)
    const ma = (i: number, n: number) => {
      if (i < n - 1) return null
      let s = 0
      for (let k = 0; k < n; k++) s += closes[i - k]
      return s / n
    }
    return candles.map((c, i) => {
      const row: Record<string, number | string | null> = {
        date: new Date(c.t).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        close: c.c,
        high: c.h,
        low: c.l,
        vol: c.v,
        ma20: ma(i, 20),
      }
      if (q?.high52 && q?.low52 && q.high52 > q.low52) {
        row.pos52 = ((c.c - q.low52) / (q.high52 - q.low52)) * 100
      }
      return row
    })
  }, [candles, q])

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="nf-art-line" />
      <Link to="/search" className="text-sm font-semibold text-[#1e3a5f] inline-flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Search
      </Link>
      {loading && <Card className="text-sm text-[#5c5348]">Loading…</Card>}
      {q && !loading && (
        <>
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#1a1520]">{q.name}</h1>
              <p className="text-sm text-[#5c5348]">
                {q.symbol} · {q.source}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold tabular-nums">
                {q.price != null ? q.price.toLocaleString('en-IN') : '—'}
              </div>
              <div
                className={`text-sm font-semibold ${
                  (q.changePct ?? 0) >= 0 ? 'text-[#1f6b4a]' : 'text-[#6b2c3e]'
                }`}
              >
                {q.changePct != null ? `${q.changePct >= 0 ? '+' : ''}${q.changePct.toFixed(2)}%` : '—'}
              </div>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['52W high', q.high52],
              ['52W low', q.low52],
              ['Day high', q.dayHigh],
              ['Day low', q.dayLow],
              ['PE', q.pe],
              ['Volume', q.volume],
              ['Mkt cap', null],
              ['Prev close', q.previousClose],
            ].map(([label, val]) => (
              <Card key={String(label)}>
                <div className="text-[10px] font-semibold text-[#5c5348]">{label as string}</div>
                <div className="font-bold tabular-nums mt-0.5">
                  {label === 'Mkt cap'
                    ? formatInrCr(q.marketCap)
                    : val != null
                      ? Number(val).toLocaleString('en-IN')
                      : '—'}
                </div>
              </Card>
            ))}
          </div>
          <Card>
            <div className="text-xs font-semibold text-[#5c5348]">Educational screen</div>
            <div className="text-xl font-bold mt-1">
              {rating?.score}/100 · {rating?.label}
            </div>
            <ul className="mt-2 text-xs text-[#5c5348] space-y-1">
              {rating?.notes.map((n) => (
                <li key={n}>• {n}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <div className="flex flex-wrap gap-2 mb-2">
              {CHART_MODES.map((m) => (
                <Button
                  key={m.id}
                  size="sm"
                  variant={mode === m.id ? 'primary' : 'outline'}
                  onClick={() => setMode(m.id)}
                >
                  {m.label}
                </Button>
              ))}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid stroke="rgba(90,60,20,0.08)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={24} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} width={48} />
                  <Tooltip />
                  {mode === 'close' && (
                    <Area type="monotone" dataKey="close" stroke="#1e3a5f" fill="rgba(30,58,95,0.12)" />
                  )}
                  {mode === 'range' && (
                    <>
                      <Area type="monotone" dataKey="high" stroke="#c9a227" fill="rgba(201,162,39,0.1)" />
                      <Area type="monotone" dataKey="low" stroke="#1f6b4a" fill="rgba(31,107,74,0.08)" />
                    </>
                  )}
                  {mode === 'ma20' && (
                    <>
                      <Area type="monotone" dataKey="close" stroke="#1e3a5f" fill="rgba(30,58,95,0.08)" />
                      <Area type="monotone" dataKey="ma20" stroke="#c9a227" fill="transparent" />
                    </>
                  )}
                  {mode === 'vol' && (
                    <Area type="monotone" dataKey="vol" stroke="#6b2c3e" fill="rgba(107,44,62,0.12)" />
                  )}
                  {mode === 'pos52' && (
                    <Area type="monotone" dataKey="pos52" stroke="#1f6b4a" fill="rgba(31,107,74,0.12)" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

/* ───────── News ───────── */
function NewsBadge({ tone }: { tone: ImpactTone }) {
  const label = tone === 'up' ? 'Upside lean' : tone === 'down' ? 'Downside lean' : 'Mixed'
  const color =
    tone === 'up'
      ? 'text-[#1f6b4a] bg-[rgba(31,107,74,0.12)]'
      : tone === 'down'
        ? 'text-[#6b2c3e] bg-[rgba(107,44,62,0.1)]'
        : 'text-[#1e3a5f] bg-[rgba(30,58,95,0.1)]'
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${color}`}>{label}</span>
  )
}

export function NewsIntelPage() {
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="nf-art-line" />
      <h1 className="text-2xl font-bold text-[#1a1520]">News impact desk</h1>
      <p className="text-sm text-[#5c5348]">Educational colour lean · examples · not guaranteed</p>
      {SAMPLE_NEWS.map((n) => (
        <Card key={n.id} className={`border ${toneClasses(n.tone)}`}>
          <div className="flex flex-wrap gap-2 mb-1">
            <NewsBadge tone={n.tone} />
            <span className="text-[10px] text-[#5c5348] uppercase">{n.scope}</span>
          </div>
          <div className="font-semibold text-[#1a1520]">{n.headline}</div>
          <p className="text-sm text-[#5c5348] mt-1">{n.why}</p>
          <div className="mt-2 text-xs">
            <strong>Primary:</strong> {n.primarySymbols.join(', ')}
          </div>
          {!!n.indirect.length && (
            <div className="mt-2 rounded-xl bg-white/70 border border-[rgba(90,60,20,0.1)] p-3 text-xs">
              <div className="font-semibold mb-1">Indirect impact</div>
              {n.indirect.map((x) => (
                <div key={x.symbol}>
                  <strong>{x.symbol}:</strong> {x.effect}
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

/* ───────── IPO ───────── */
const FILTERS: { id: 'all' | IpoStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'closed', label: 'Closed' },
  { id: 'listed', label: 'Listed' },
]

export function IpoDeskPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')
  const rows = useMemo(
    () => (filter === 'all' ? IPO_DESK : IPO_DESK.filter((x) => x.status === filter)),
    [filter],
  )
  return (
    <div className="space-y-4 max-w-4xl">
      <div className="nf-art-line" />
      <h1 className="text-2xl font-bold text-[#1a1520] flex items-center gap-2">
        <Landmark className="h-6 w-6 text-[#c9a227]" />
        IPO Desk
      </h1>
      <Card className="border border-[rgba(107,44,62,0.25)] bg-[rgba(107,44,62,0.05)] text-sm">
        <strong>GMP disclaimer:</strong> Grey market premium is unofficial. Not a target or guarantee.
        Verify on NSE/SEBI.
      </Card>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
              filter === f.id
                ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                : 'bg-white text-[#1a1520] border-[rgba(90,60,20,0.15)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {rows.map((ipo) => (
        <Card key={ipo.id}>
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <div className="font-bold text-lg text-[#1a1520]">{ipo.name}</div>
              <div className="text-xs text-[#5c5348]">
                {ipo.type} · {ipo.exchange}
              </div>
            </div>
            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${statusStyle(ipo.status)}`}>
              {ipo.status}
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div>
              <div className="text-[10px] font-semibold text-[#5c5348]">Price band</div>
              <div className="font-semibold">{ipo.priceBand}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-[#5c5348]">Lot</div>
              <div className="font-semibold">{ipo.lotSize ?? '—'}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-[#5c5348]">Open → Close</div>
              <div className="font-semibold">
                {ipo.openDate} → {ipo.closeDate}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-[#5c5348]">Listing</div>
              <div className="font-semibold">{ipo.listingDate}</div>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-[rgba(201,162,39,0.35)] bg-[rgba(201,162,39,0.08)] p-3 text-xs">
            <strong>GMP note:</strong> {ipo.gmpNote}
          </div>
          {ipo.nseLink && (
            <a
              href={ipo.nseLink}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#1e3a5f]"
            >
              NSE IPO page <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </Card>
      ))}
    </div>
  )
}
