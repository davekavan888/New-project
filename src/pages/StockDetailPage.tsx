import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
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
  type Candle,
  type StockQuote,
} from '@/services/stocks'
import { ArrowLeft } from 'lucide-react'

const CHART_MODES = [
  { id: 'close', label: 'Close trend', tip: 'Simple price path — good for beginners' },
  { id: 'range', label: 'High-Low band', tip: 'Session range feel via high/low envelope' },
  { id: 'ma20', label: 'vs 20-day avg', tip: 'Above/below short average' },
  { id: 'vol', label: 'Volume bars', tip: 'Participation interest (not direction alone)' },
  { id: 'pos52', label: '52W position', tip: 'Where price sits between 52W high & low' },
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
        i,
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

  const modeTip = CHART_MODES.find((m) => m.id === mode)?.tip

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="nf-art-line" />
      <Link to="/search" className="text-sm font-semibold text-[#1a5f9e] inline-flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Search
      </Link>

      {loading && <Card className="text-sm text-[#5a6b82]">Loading snapshot…</Card>}

      {q && !loading && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#0f1b2d]">{q.name}</h1>
              <p className="text-sm text-[#5a6b82]">
                {q.symbol} · {q.exchange} · data {q.source}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold tabular-nums text-[#0f1b2d]">
                {q.price != null ? q.price.toLocaleString('en-IN') : '—'}
              </div>
              <div
                className={`text-sm font-semibold ${
                  (q.changePct ?? 0) >= 0 ? 'text-[#2d8f6f]' : 'text-[#b33a3a]'
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
              ['Prev close', q.previousClose],
              ['Volume', q.volume],
              ['Avg volume', q.avgVolume],
              ['Mkt cap', null as number | null],
            ].map(([label, val], idx) => (
              <Card key={String(label)}>
                <div className="text-[10px] font-semibold text-[#5a6b82]">{label as string}</div>
                <div className="font-bold tabular-nums text-[#0f1b2d] mt-0.5">
                  {label === 'Mkt cap'
                    ? formatInrCr(q.marketCap)
                    : val != null
                      ? Number(val).toLocaleString('en-IN')
                      : '—'}
                </div>
              </Card>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Card>
              <div className="text-xs font-semibold text-[#5a6b82]">PE (trailing / avail.)</div>
              <div className="text-2xl font-bold text-[#0f1b2d] mt-1">
                {q.pe != null ? q.pe.toFixed(1) : '—'}
              </div>
              <p className="text-[11px] text-[#5a6b82] mt-1">EPS: {q.eps ?? '—'}</p>
            </Card>
            <Card className="lg:col-span-2">
              <div className="text-xs font-semibold text-[#5a6b82]">Educational screen card</div>
              <div className="text-2xl font-bold text-[#0f1b2d] mt-1">
                {rating?.score}/100 · {rating?.label}
              </div>
              <ul className="mt-2 text-xs text-[#5a6b82] space-y-1">
                {rating?.notes.map((n) => (
                  <li key={n}>• {n}</li>
                ))}
              </ul>
            </Card>
          </div>

          <Card>
            <div className="text-xs font-semibold text-[#0f1b2d] mb-1">Order book / full financials</div>
            <p className="text-sm text-[#5a6b82]">
              Live order book, full balance-sheet debt, quarterly revenue, and broker-grade depth need
              licensed market data (Groww/Angel depth APIs or paid vendors). This page shows{' '}
              <strong>delayed public snapshot</strong> only — not a Groww clone.
            </p>
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
            <p className="text-[11px] text-[#5a6b82] mb-2">{modeTip}</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid stroke="rgba(15,40,80,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5a6b82' }} minTickGap={24} />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 10, fill: '#5a6b82' }}
                    width={48}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid rgba(15,40,80,0.12)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  {mode === 'close' && (
                    <Area type="monotone" dataKey="close" stroke="#1a5f9e" fill="rgba(26,95,158,0.15)" />
                  )}
                  {mode === 'range' && (
                    <>
                      <Area type="monotone" dataKey="high" stroke="#c9a227" fill="rgba(201,162,39,0.12)" />
                      <Area type="monotone" dataKey="low" stroke="#2d8f6f" fill="rgba(45,143,111,0.1)" />
                    </>
                  )}
                  {mode === 'ma20' && (
                    <>
                      <Area type="monotone" dataKey="close" stroke="#1a5f9e" fill="rgba(26,95,158,0.08)" />
                      <Area type="monotone" dataKey="ma20" stroke="#c9a227" fill="transparent" />
                    </>
                  )}
                  {mode === 'vol' && (
                    <Area type="monotone" dataKey="vol" stroke="#6b5344" fill="rgba(107,83,68,0.2)" />
                  )}
                  {mode === 'pos52' && (
                    <Area type="monotone" dataKey="pos52" stroke="#2d8f6f" fill="rgba(45,143,111,0.15)" />
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
